package com.example.Bakend.service;

import org.aopalliance.intercept.MethodInterceptor;
import org.aopalliance.intercept.MethodInvocation;
import org.springframework.aop.framework.ProxyFactory;
import org.springframework.stereotype.Component;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.DefaultTransactionDefinition;

/**
 * Wrapper AOP de transactions : {@link #wrap(Object)} enveloppe toute une classe
 * service dans un proxy qui gère automatiquement les transactions.
 * <p>
 * Chaque appel de méthode du proxy est enveloppé dans une transaction
 * (commit en cas de succès, rollback en cas d'exception). Le mode
 * lecture seule / écriture est déterminé automatiquement :
 * <ul>
 *   <li>par l'annotation {@link Transactional} (attribut {@code readOnly}) si présente ;</li>
 *   <li>sinon par le préfixe du nom de la méthode (get/find/obtenir/lister/…) → lecture seule,</li>
 *   <li>tout le reste → lecture/écriture.</li>
 * </ul>
 */
@Component
public class TransactionWrapper {

    private final PlatformTransactionManager transactionManager;

    public TransactionWrapper(PlatformTransactionManager transactionManager) {
        this.transactionManager = transactionManager;
    }

    /**
     * Enveloppe un service dans un proxy transactionnel. Le bean résultat doit être
     * enregistré comme bean Spring à la place de l'implémentation nue.
     */
    public <T> T wrap(T service) {
        ProxyFactory proxyFactory = new ProxyFactory(service);
        proxyFactory.addAdvice(new TransactionMethodInterceptor());
        @SuppressWarnings("unchecked")
        T proxy = (T) proxyFactory.getProxy();
        return proxy;
    }

    private class TransactionMethodInterceptor implements MethodInterceptor {

        @Override
        public Object invoke(MethodInvocation invocation) throws Throwable {
            DefaultTransactionDefinition definition = new DefaultTransactionDefinition();
            definition.setReadOnly(isReadOnly(invocation.getMethod()));

            TransactionStatus status = transactionManager.getTransaction(definition);
            try {
                Object result = invocation.proceed();
                transactionManager.commit(status);
                return result;
            } catch (Throwable ex) {
                transactionManager.rollback(status);
                throw ex;
            }
        }

        private boolean isReadOnly(java.lang.reflect.Method method) {
            Transactional transactional = method.getAnnotation(Transactional.class);
            if (transactional != null) {
                return transactional.readOnly();
            }
            String name = method.getName().toLowerCase();
            return name.startsWith("get")
                    || name.startsWith("find")
                    || name.startsWith("obtenir")
                    || name.startsWith("lister")
                    || name.startsWith("rechercher")
                    || name.startsWith("compter")
                    || name.startsWith("list")
                    || name.startsWith("count")
                    || name.startsWith("read");
        }
    }
}