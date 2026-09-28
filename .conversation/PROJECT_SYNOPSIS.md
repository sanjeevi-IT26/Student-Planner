# Project Synopsis

## 1. Project Title

**Smart Campus Task & Event Tracker**

## 2. Introduction

Students manage assignments, examinations, project deadlines, campus events, and personal activities throughout the academic year. When these activities are tracked in separate notebooks, messages, or applications, important deadlines can easily be missed.

The Smart Campus Task & Event Tracker is a web-based application that allows students to organize academic and campus-related activities in one place. Students can create tasks, assign categories and priorities, set due dates, mark tasks as completed, edit existing tasks, delete tasks, and schedule recurring activities.

## 3. Problem Statement

Students need a simple and centralized system to manage multiple academic deadlines and campus activities. Traditional methods such as paper diaries or scattered notes do not provide automatic organization, filtering, recurring task support, or quick progress tracking.

This project addresses the problem by providing a lightweight web application that stores and displays student tasks in an organized dashboard.

## 4. Aim of the Project

To develop a user-friendly web application that helps students plan, track, and complete academic tasks and campus events efficiently.

## 5. Objectives

- Provide a centralized place to manage student tasks and events.
- Allow users to add tasks with titles, categories, due dates, and priorities.
- Allow users to edit and delete tasks.
- Allow users to mark tasks as completed.
- Support daily, weekly, and monthly recurring tasks.
- Display task statistics such as total, upcoming, and completed tasks.
- Store task information permanently using an SQLite database.
- Provide a responsive interface that works on desktop and mobile screens.

## 6. Scope of the Project

### Included

- Task and event creation
- Task categorization
- Due-date management
- Priority management
- Completion tracking
- Edit and delete operations
- Recurring task generation
- Task filtering
- SQLite database storage
- REST API-based communication between frontend and backend

### Not Included in the Initial Version

- Multi-user login
- Teacher or administrator accounts
- Email and mobile notifications
- File uploads
- Online synchronization between devices
- Native Android or iOS application

These features can be added as future enhancements.

## 7. Proposed System

The proposed system consists of a web interface connected to a Flask backend. Users interact with the frontend to add or manage tasks. The frontend sends requests to the backend through REST API endpoints. The backend validates the data and stores it in the SQLite database.

When a recurring task is completed, the system keeps the completed record and automatically creates the next open occurrence based on the selected schedule.

## 8. Main Modules

### 8.1 Dashboard Module

Displays the application header, current date, task list, summary statistics, and available filters.

### 8.2 Add Task Module

Allows students to create a task using:

- Task title
- Category
- Due date
- Priority
- Repeat schedule

### 8.3 View and Filter Module

Displays tasks and allows users to filter them by:

- All tasks
- Open tasks
- Completed tasks

### 8.4 Task Completion Module

Allows users to mark an open task as completed. For recurring tasks, the next occurrence is automatically created.

### 8.5 Edit Task Module

Allows users to update the title, category, due date, priority, or repeat schedule of an existing task.

### 8.6 Delete Task Module

Allows users to permanently remove a task after confirmation.

### 8.7 Database Module

Stores task records in an SQLite database and retrieves them through Flask API routes.

## 9. Technology Stack

| Layer | Technology |
|---|---|
| Frontend structure | HTML5 |
| Frontend styling | CSS3 |
| Frontend logic | JavaScript |
| Backend | Python Flask |
| Database | SQLite |
| Communication | REST API and JSON |
| Development environment | Replit or local Python environment |

## 10. System Requirements

### Hardware Requirements

- Computer or laptop
- Minimum 2 GB RAM
- Minimum 100 MB free storage
- Internet connection for initial setup, if using Replit

### Software Requirements

- Python 3.11 or later
- Flask 3.x
- Modern web browser
- Code editor or Replit workspace

## 11. Database Design

### Table: `tasks`

| Field | Type | Description |
|---|---|---|
| `id` | Integer | Primary key |
| `title` | Text | Name of the task or event |
| `category` | Text | Coursework, exam, project, or event category |
| `due_date` | Date | Task deadline |
| `priority` | Text | Low, Medium, or High |
| `recurrence` | Text | None, Daily, Weekly, or Monthly |
| `is_completed` | Integer | Completion status: 0 or 1 |

## 12. API Design

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/api/tasks` | Retrieve all tasks |
| `POST` | `/api/tasks` | Create a new task |
| `PATCH` | `/api/tasks/<id>` | Update an existing task |
| `DELETE` | `/api/tasks/<id>` | Delete a task |
| `PATCH` | `/api/tasks/<id>/complete` | Mark a task as completed |

## 13. System Workflow

```text
User opens application
        |
        v
Dashboard loads tasks from SQLite
        |
        v
User adds, edits, completes, or deletes a task
        |
        v
Frontend sends JSON request to Flask API
        |
        v
Flask validates and processes the request
        |
        v
SQLite database is updated
        |
        v
Dashboard refreshes and displays updated data
```

## 14. Functional Requirements

- The system must display existing tasks.
- The system must allow a user to create a task.
- The system must validate required task fields.
- The system must allow a user to edit a task.
- The system must allow a user to delete a task.
- The system must allow a user to mark a task as complete.
- The system must create the next occurrence of a recurring task.
- The system must save data in a database.
- The system must show meaningful error messages for invalid input.

## 15. Non-Functional Requirements

- The interface should be simple and easy to understand.
- API responses should be returned in JSON format.
- The application should work on common modern browsers.
- The system should preserve data after the application restarts.
- User input should be validated before being stored.
- The interface should be usable on both desktop and mobile screens.

## 16. Testing Plan

| Test Case | Expected Result |
|---|---|
| Open the home page | Dashboard loads successfully |
| Add a valid task | Task is stored and displayed |
| Submit an empty title | Validation error is displayed |
| Enter an invalid date | Validation error is displayed |
| Edit a task | Updated values are displayed |
| Delete a task | Task is removed after confirmation |
| Complete a normal task | Task becomes completed |
| Complete a weekly task | Next weekly task is created |
| Restart the application | Existing tasks remain available |
| Open on a mobile screen | Layout adapts to smaller width |

## 17. Advantages

- Easy to use
- Reduces missed deadlines
- Centralizes academic planning
- Supports recurring activities
- Uses a lightweight database
- Can be extended into a larger student productivity platform
- Demonstrates important first-year programming concepts

## 18. Limitations

- The initial version is designed for a single user.
- It does not currently send reminders.
- The application does not include authentication.
- SQLite is suitable for a small application but not large-scale concurrent use.
- Tasks are currently managed from one application interface.

## 19. Future Enhancements

- User registration and login
- Student, teacher, and administrator roles
- Email, browser, or mobile notifications
- Calendar-based task view
- Search and advanced category filtering
- Notes and file attachments
- Course and subject management
- Google Calendar integration
- Android and iOS mobile applications
- Cloud database and multi-device synchronization
- Progress charts and productivity reports

## 20. Conclusion

The Smart Campus Task & Event Tracker is a practical web application designed to help students organize their academic responsibilities and campus activities. It provides essential task-management features while demonstrating fundamental concepts such as frontend development, backend programming, REST APIs, database operations, validation, and responsive design.

The project is appropriate for a first-year IT student because it solves a real student problem while remaining understandable, testable, and expandable. Additional features such as authentication, notifications, and calendar integration can be introduced as the student's technical knowledge grows.

## 21. References

- Python Documentation: https://docs.python.org/3/
- Flask Documentation: https://flask.palletsprojects.com/
- SQLite Documentation: https://sqlite.org/docs.html
- MDN Web Docs: https://developer.mozilla.org/