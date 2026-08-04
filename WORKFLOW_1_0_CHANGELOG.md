# Workflow Automation 1.0

- CRM status `active` triggers candidate activation workflow.
- Creates or reuses a Team profile.
- Assigns the published `Основы LegionHunt` Academy course.
- Writes Team, CRM, Notifications and Analytics-visible activity.
- Adds `/workflows` with execution history and step details.
- Workflow is idempotent: an already completed candidate activation is not repeated.
