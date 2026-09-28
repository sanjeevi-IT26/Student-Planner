from calendar import monthrange
from datetime import date, timedelta
from functools import wraps
import os
from pathlib import Path
import sqlite3

from flask import Flask, jsonify, redirect, render_template, request, session, url_for
from werkzeug.security import check_password_hash, generate_password_hash


app = Flask(__name__)
app.secret_key = os.environ.get("SESSION_SECRET", "campustrack-development-secret")
DATABASE = Path(__file__).with_name("campus_tracker.db")
PRIORITIES = {"Low", "Medium", "High"}
RECURRENCES = {"None", "Daily", "Weekly", "Monthly"}


def get_db_connection():
    connection = sqlite3.connect(DATABASE)
    connection.row_factory = sqlite3.Row
    return connection


def init_db():
    connection = get_db_connection()
    connection.execute(
        """
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL UNIQUE,
            password_hash TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """
    )
    connection.execute(
        """
        CREATE TABLE IF NOT EXISTS tasks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            category TEXT NOT NULL,
            due_date DATE NOT NULL,
            priority TEXT NOT NULL DEFAULT 'Medium',
            recurrence TEXT NOT NULL DEFAULT 'None',
            is_completed INTEGER NOT NULL DEFAULT 0,
            user_id INTEGER
        )
        """
    )
    columns = {
        row["name"]
        for row in connection.execute("PRAGMA table_info(tasks)").fetchall()
    }
    if "recurrence" not in columns:
        connection.execute(
            "ALTER TABLE tasks ADD COLUMN recurrence TEXT NOT NULL DEFAULT 'None'"
        )
    if "user_id" not in columns:
        connection.execute("ALTER TABLE tasks ADD COLUMN user_id INTEGER")
    connection.commit()
    connection.close()


def login_required(view):
    @wraps(view)
    def wrapped_view(*args, **kwargs):
        if "user_id" not in session:
            if request.path.startswith("/api/"):
                return jsonify({"error": "Please log in first."}), 401
            return redirect(url_for("login"))
        return view(*args, **kwargs)

    return wrapped_view


@app.route("/")
@login_required
def home():
    return render_template("index.html", username=session["username"])


@app.route("/register", methods=["GET", "POST"])
def register():
    if "user_id" in session:
        return redirect(url_for("home"))

    error = None
    if request.method == "POST":
        username = request.form.get("username", "").strip()
        password = request.form.get("password", "")
        confirm_password = request.form.get("confirm_password", "")

        if len(username) < 3:
            error = "Username must contain at least 3 characters."
        elif len(password) < 6:
            error = "Password must contain at least 6 characters."
        elif password != confirm_password:
            error = "Passwords do not match."
        else:
            connection = get_db_connection()
            try:
                user_count = connection.execute(
                    "SELECT COUNT(*) AS count FROM users"
                ).fetchone()["count"]
                cursor = connection.execute(
                    """
                    INSERT INTO users (username, password_hash)
                    VALUES (?, ?)
                    """,
                    (username, generate_password_hash(password)),
                )
                if user_count == 0:
                    connection.execute(
                        "UPDATE tasks SET user_id = ? WHERE user_id IS NULL",
                        (cursor.lastrowid,),
                    )
                connection.commit()
                session.clear()
                session["user_id"] = cursor.lastrowid
                session["username"] = username
                connection.close()
                return redirect(url_for("home"))
            except sqlite3.IntegrityError:
                connection.rollback()
                connection.close()
                error = "That username is already taken."

    return render_template("auth.html", mode="register", error=error)


@app.route("/login", methods=["GET", "POST"])
def login():
    if "user_id" in session:
        return redirect(url_for("home"))

    error = None
    if request.method == "POST":
        username = request.form.get("username", "").strip()
        password = request.form.get("password", "")
        connection = get_db_connection()
        user = connection.execute(
            "SELECT * FROM users WHERE username = ?", (username,)
        ).fetchone()
        connection.close()

        if user is None or not check_password_hash(user["password_hash"], password):
            error = "Incorrect username or password."
        else:
            session.clear()
            session["user_id"] = user["id"]
            session["username"] = user["username"]
            return redirect(url_for("home"))

    return render_template("auth.html", mode="login", error=error)


@app.route("/logout")
def logout():
    session.clear()
    return redirect(url_for("login"))


@app.route("/api/me", methods=["GET"])
@login_required
def get_current_user():
    return jsonify({"id": session["user_id"], "username": session["username"]})


@app.route("/api/tasks", methods=["GET"])
@login_required
def get_tasks():
    connection = get_db_connection()
    tasks = connection.execute(
        """
        SELECT * FROM tasks
        WHERE user_id = ?
        ORDER BY is_completed ASC, due_date ASC, id ASC
        """,
        (session["user_id"],),
    ).fetchall()
    connection.close()
    return jsonify([dict(task) for task in tasks])


def validate_task_data(data, existing=None):
    existing = existing or {}
    title = str(data.get("title", existing.get("title", ""))).strip()
    category = str(data.get("category", existing.get("category", ""))).strip()
    due_date = str(data.get("due_date", existing.get("due_date", ""))).strip()
    priority = str(
        data.get("priority", existing.get("priority", "Medium"))
    ).strip().title()
    recurrence = str(
        data.get("recurrence", existing.get("recurrence", "None"))
    ).strip().title()

    errors = {}
    if not title:
        errors["title"] = "Add a task title."
    if not category:
        errors["category"] = "Choose a category."
    if not due_date:
        errors["due_date"] = "Choose a due date."
    else:
        try:
            date.fromisoformat(due_date)
        except ValueError:
            errors["due_date"] = "Use a valid date."
    if priority not in PRIORITIES:
        errors["priority"] = "Priority must be Low, Medium, or High."
    if recurrence not in RECURRENCES:
        errors["recurrence"] = "Choose a valid repeat schedule."

    if errors:
        return None, errors
    return {
        "title": title,
        "category": category,
        "due_date": due_date,
        "priority": priority,
        "recurrence": recurrence,
    }, {}


@app.route("/api/tasks", methods=["POST"])
@login_required
def add_task():
    data = request.get_json(silent=True) or {}
    task_data, errors = validate_task_data(data)

    if errors:
        return jsonify({"error": "Please check the form.", "fields": errors}), 400

    connection = get_db_connection()
    cursor = connection.execute(
        """
        INSERT INTO tasks
            (title, category, due_date, priority, recurrence, user_id)
        VALUES (?, ?, ?, ?, ?, ?)
        """,
        (*task_data.values(), session["user_id"]),
    )
    connection.commit()
    task = connection.execute(
        "SELECT * FROM tasks WHERE id = ?", (cursor.lastrowid,)
    ).fetchone()
    connection.close()
    return jsonify(dict(task)), 201


@app.route("/api/tasks/<int:task_id>", methods=["PATCH"])
@login_required
def update_task(task_id):
    data = request.get_json(silent=True) or {}
    connection = get_db_connection()
    existing = connection.execute(
        "SELECT * FROM tasks WHERE id = ? AND user_id = ?",
        (task_id, session["user_id"]),
    ).fetchone()

    if existing is None:
        connection.close()
        return jsonify({"error": "Task not found."}), 404

    task_data, errors = validate_task_data(data, dict(existing))
    if errors:
        connection.close()
        return jsonify({"error": "Please check the form.", "fields": errors}), 400

    connection.execute(
        """
        UPDATE tasks
        SET title = ?, category = ?, due_date = ?, priority = ?, recurrence = ?
        WHERE id = ?
        """,
        (*task_data.values(), task_id),
    )
    connection.commit()
    updated = connection.execute(
        "SELECT * FROM tasks WHERE id = ?", (task_id,)
    ).fetchone()
    connection.close()
    return jsonify(dict(updated))


@app.route("/api/tasks/<int:task_id>", methods=["DELETE"])
@login_required
def delete_task(task_id):
    connection = get_db_connection()
    cursor = connection.execute(
        "DELETE FROM tasks WHERE id = ? AND user_id = ?",
        (task_id, session["user_id"]),
    )
    connection.commit()
    connection.close()

    if cursor.rowcount == 0:
        return jsonify({"error": "Task not found."}), 404
    return jsonify({"status": "deleted", "id": task_id})


def next_due_date(due_date, recurrence):
    current = date.fromisoformat(due_date)
    if recurrence == "Daily":
        return current + timedelta(days=1)
    if recurrence == "Weekly":
        return current + timedelta(days=7)
    if recurrence == "Monthly":
        month_index = current.month
        year = current.year
        if month_index == 12:
            month_index = 1
            year += 1
        else:
            month_index += 1
        day = min(current.day, monthrange(year, month_index)[1])
        return date(year, month_index, day)
    return None


@app.route("/api/tasks/<int:task_id>/complete", methods=["PATCH"])
@login_required
def complete_task(task_id):
    connection = get_db_connection()
    task = connection.execute(
        "SELECT * FROM tasks WHERE id = ? AND user_id = ?",
        (task_id, session["user_id"]),
    ).fetchone()

    if task is None:
        connection.close()
        return jsonify({"error": "Task not found."}), 404
    if task["is_completed"]:
        connection.close()
        return jsonify({"status": "already_completed", "id": task_id})

    connection.execute("UPDATE tasks SET is_completed = 1 WHERE id = ?", (task_id,))
    next_task = None
    next_date = next_due_date(task["due_date"], task["recurrence"])
    if next_date:
        cursor = connection.execute(
            """
            INSERT INTO tasks
                (title, category, due_date, priority, recurrence, user_id)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (
                task["title"],
                task["category"],
                next_date.isoformat(),
                task["priority"],
                task["recurrence"],
                session["user_id"],
            ),
        )
        next_task = connection.execute(
            "SELECT * FROM tasks WHERE id = ?", (cursor.lastrowid,)
        ).fetchone()
    connection.commit()
    connection.close()

    response = {"status": "completed", "id": task_id}
    if next_task:
        response["next_task"] = dict(next_task)
    return jsonify(response)


init_db()

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8080, debug=True)