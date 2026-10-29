---
name: CampusTrack access and points
description: Product rules for faculty roles, group enrollment, student group admins, and task points.
---

CampusTrack must support multiple faculty accounts. Students join groups with a group code, and faculty can appoint student group admins who assign work to selected group members. Automatic assigned-task points are 20 before the due date, 10 on the due date, 0 one day late, -5 at 2–4 days late, and -10 after 4 days late. Faculty can also adjust student points.

**Why:** The user requested a multi-faculty setup, code-based enrollment, student group admins, and these exact scoring tiers.

**How to apply:** Keep role permissions group-scoped, preserve the scoring tiers in server behavior and student-facing copy, and do not add a student-controlled faculty role option.
