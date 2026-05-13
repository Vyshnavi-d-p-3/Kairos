package com.kairos.config;

import com.kairos.tenant.TenantContext;
import com.zaxxer.hikari.HikariDataSource;
import org.springframework.boot.autoconfigure.jdbc.DataSourceProperties;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;

import javax.sql.DataSource;
import java.io.PrintWriter;
import java.lang.reflect.InvocationHandler;
import java.lang.reflect.Method;
import java.lang.reflect.Proxy;
import java.sql.Connection;
import java.sql.SQLException;
import java.sql.SQLFeatureNotSupportedException;
import java.util.UUID;
import java.util.logging.Logger;

/**
 * Per-connection {@code app.current_workspace} for RLS ({@code current_workspace_id()}).
 * Pool checkout sets it from {@link com.kairos.tenant.TenantContext}; Hikari init-sql cannot (tenant varies per request).
 */
@Configuration
public class RlsDataSourceConfig {

    // Only dataSource() below is @Primary (avoid two primaries breaking JDBC auto-config).
    @Bean
    @ConfigurationProperties("spring.datasource.hikari")
    public HikariDataSource hikariDataSource(DataSourceProperties properties) {
        return properties.initializeDataSourceBuilder()
            .type(HikariDataSource.class)
            .build();
    }

    @Bean
    @Primary
    public DataSource dataSource(HikariDataSource hikari) {
        return new RlsDataSource(hikari);
    }

    static final class RlsDataSource implements DataSource {
        private final DataSource delegate;

        RlsDataSource(DataSource delegate) { this.delegate = delegate; }

        @Override public Connection getConnection() throws SQLException {
            return wrap(delegate.getConnection());
        }

        @Override public Connection getConnection(String u, String p) throws SQLException {
            return wrap(delegate.getConnection(u, p));
        }

        private Connection wrap(Connection raw) throws SQLException {
            UUID workspace = TenantContext.workspaceId();
            applyWorkspace(raw, workspace);
            return (Connection) Proxy.newProxyInstance(
                getClass().getClassLoader(),
                new Class<?>[]{Connection.class},
                new TenantAwareConnectionHandler(raw)
            );
        }

        private static void applyWorkspace(Connection conn, UUID workspace) throws SQLException {
            try (var stmt = conn.prepareStatement(
                    "SELECT set_config('app.current_workspace', ?, false)")) {
                stmt.setString(1, workspace == null ? "" : workspace.toString());
                stmt.execute();
            }
        }

        @Override public PrintWriter getLogWriter() throws SQLException { return delegate.getLogWriter(); }
        @Override public void setLogWriter(PrintWriter out) throws SQLException { delegate.setLogWriter(out); }
        @Override public void setLoginTimeout(int seconds) throws SQLException { delegate.setLoginTimeout(seconds); }
        @Override public int getLoginTimeout() throws SQLException { return delegate.getLoginTimeout(); }
        @Override public Logger getParentLogger() throws SQLFeatureNotSupportedException { return delegate.getParentLogger(); }
        @Override @SuppressWarnings("unchecked") public <T> T unwrap(Class<T> iface) throws SQLException {
            if (iface.isInstance(this)) return (T) this;
            return delegate.unwrap(iface);
        }
        @Override public boolean isWrapperFor(Class<?> iface) throws SQLException {
            return iface.isInstance(this) || delegate.isWrapperFor(iface);
        }
    }

    // Clear GUC on close so pooled connections are not sticky per tenant.
    static final class TenantAwareConnectionHandler implements InvocationHandler {
        private final Connection delegate;
        TenantAwareConnectionHandler(Connection delegate) { this.delegate = delegate; }

        @Override
        public Object invoke(Object proxy, Method method, Object[] args) throws Throwable {
            if ("close".equals(method.getName())) {
                try (var stmt = delegate.prepareStatement(
                        "SELECT set_config('app.current_workspace', '', false)")) {
                    stmt.execute();
                } catch (SQLException ignored) {
                    // ignore if connection already broken; delegate close still runs
                }
                return method.invoke(delegate, args);
            }
            try {
                return method.invoke(delegate, args);
            } catch (java.lang.reflect.InvocationTargetException ite) {
                throw ite.getTargetException();
            }
        }
    }
}
