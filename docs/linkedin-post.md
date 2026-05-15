# LinkedIn Post Draft

I built and deployed OperationHub, a multi-tenant operations and compliance platform designed around Irish commercial building workflows.

The platform supports fire safety checks, parking operations, and swimming pool compliance. Field workers complete tasks through a native Android APK, including checklist answers and photo evidence. Managers review submissions through a React web dashboard, and the system keeps audit-ready records for compliance and reporting.

This was built as a production-style platform engineering project, not just a CRUD app:

- React web dashboard.
- Node.js / Express API.
- PostgreSQL database.
- Native Android field APK.
- Dockerized deployment.
- Nginx Proxy Manager.
- Prometheus and Grafana monitoring.
- Backup and restore automation.
- Multi-tenant organization model.
- FireOps, ParkOps, and PoolOps vertical workflows.

The goal was to model how a single platform can support several regulated operational environments by sharing the same task, evidence, audit, reporting, and monitoring foundations.

For me, the strongest learning was connecting product thinking with platform engineering: the system is not only technically deployable, it is positioned around a real commercial problem in facilities management.
