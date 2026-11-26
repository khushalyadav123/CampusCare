# CampusCare — College Complaint Management System

A beginner-friendly, working full-stack mini project built with:
- Frontend: HTML, CSS, vanilla JavaScript
- Backend: Java 21, Spring Boot 3.5.6, Spring Web, Spring Data JPA, Bean Validation
- Database: MySQL

## Important: working vs. demo limitations
- Complaint records are stored in MySQL, not hard-coded in JavaScript.
- Categories and statuses are loaded from backend endpoints.
- Dashboard counts, search, filtering, pagination, complaint creation, detail view, status updates and deletion are connected to the API.
- Basic Student and Admin sign-in use server-side sessions; passwords are stored as BCrypt hashes.
- Students can self-register, submit complaints, and see only their own complaints. Admins can see every complaint and update/delete reports. Admin registration requires an invite code configured on the backend.
- This is a learning project. Add HTTPS, CSRF protection, rate limiting, and production session-cookie settings before exposing it publicly.
- Image attachments and email alerts are intentionally out of scope for the first version.

## Prerequisites
1. JDK 21
2. Maven 3.9+
3. MySQL 8+
4. VS Code or IntelliJ IDEA

## 1) Create the database
Run in MySQL:
```sql
CREATE DATABASE khushal_db;
```
The database name must match the one in `backend/src/main/resources/application.properties`. If you use a different name, update the JDBC URL there as well.

## 2) Configure database credentials
Open `backend/src/main/resources/application.properties` and set the MySQL JDBC URL, username, and password for your local database. Keep real credentials out of source control.

## 3) Run backend
From the `backend` folder:
```bash
mvn spring-boot:run
```
Backend base URL: `http://localhost:8080`
Health check: `http://localhost:8080/api/health`

Spring Boot creates/updates the `campuscare_users` and `complaints` tables automatically using JPA (`ddl-auto=update`). Using a project-specific user table prevents conflicts with any unrelated `users` table already in your MySQL database. Admin self-registration is disabled unless an invite code is configured. Set `CAMPUSCARE_ADMIN_REGISTRATION_CODE` in the environment before starting the backend; never commit a real code to source control.

### Create or sign in as an Admin
Admin and Student have separate entry points on the home page, but use the same sign-in and registration forms. Admin registration uses the shared default code `CampusCareAdmin@2026`. To override it, open PowerShell in the `backend` folder and set `CAMPUSCARE_ADMIN_REGISTRATION_CODE` before starting the backend:
```powershell
$env:CAMPUSCARE_ADMIN_REGISTRATION_CODE = "choose-your-own-private-code"
mvn spring-boot:run
```
The default code is intended for this mini-project demo only: anyone who knows it can register an Admin account. For a public deployment, set a private environment code and do not commit it. On the home page, choose **Create admin account** and enter the configured code. Successful registration signs the new account in; its `ADMIN` role opens the Admin Dashboard automatically. Existing Admins can choose **Admin sign in** and use their own email and password. The backend—not a frontend role toggle—controls the account role and Admin permissions.

## 4) Run frontend
Open `frontend/index.html` in a browser. The frontend calls the API on the same host as the page (for example, `127.0.0.1:8080` when opened from `127.0.0.1:5500`).
If your browser blocks local `file://` requests, serve the frontend with VS Code Live Server or:
```bash
cd frontend
python -m http.server 5500
```
Then open `http://localhost:5500`. The backend allows local development origins.

## API endpoints
- `GET /api/health`
- `GET /api/meta/categories`
- `GET /api/meta/statuses`
- `POST /api/auth/register` (Student signup; Admin signup also requires `adminRegistrationCode`)
- `POST /api/auth/login`
- `GET /api/auth/me`
- `POST /api/auth/logout`
- `GET /api/complaints?search=&category=&status=&page=0&size=8`
- `GET /api/complaints/stats` (live dashboard counts)
- `GET /api/complaints/{id}`
- `POST /api/complaints`
- `PATCH /api/complaints/{id}/status`
- `DELETE /api/complaints/{id}`

Authentication uses a session cookie. The browser frontend includes it automatically. Admins need an invite code at registration; students only see complaints submitted by their own account.

## Sample complaint JSON
```json
{
  "title": "Projector not working",
  "description": "The projector in the classroom does not turn on.",
  "category": "Classroom",
  "location": "Block A, Room 204"
}
```

## Suggested viva explanation
- Controller receives HTTP requests.
- Service contains business logic and validation.
- Repository uses Spring Data JPA to read/write MySQL.
- Entity maps Java fields to the database table.
- JavaScript uses `fetch()` to call the REST API; it renders the returned data dynamically.
