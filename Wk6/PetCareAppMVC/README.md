# Pet Care Journal System

A small Node.js + Express + MySQL web app (EJS views, MVC structure) where pet
owners can register pets, keep a care journal, book paid services, and pay for
them. Admins can manage users and services.

This project is used as a **starter codebase for learning to build with Kiro**.
You are not starting from a blank page — you are joining an existing project,
which is exactly what you will do in real jobs.

---

## 1. Run the app first

Get it working **before** you change anything, so that if something breaks
later you know it was your change.

### Prerequisites
- [Node.js](https://nodejs.org/) (LTS)
- MySQL running locally

### Steps

```bash
# 1. Install dependencies
npm install

# 2. Create the database and sample data
#    Run the contents of db.sql in MySQL (e.g. MySQL Workbench, or the CLI):
#    mysql -u root -p < db.sql

# 3. Check the DB connection settings in config/db.js
#    (host, user, password, database) match your local MySQL.

# 4. Start the app
node app.js
```

Then open <http://localhost:3000>.

### Sample logins (from `db.sql`)

| Username | Password   | Role  |
|----------|------------|-------|
| admin1   | admin123   | admin |
| amy      | user123    | user  |
| ben      | user123    | user  |
| clara    | user123    | user  |

---

## 2. How the code is organised (MVC)

A request flows through the app like this:

```
Browser
  → routes/      (which URL maps to which controller function)
    → middleware/ (e.g. "are you logged in?")
      → controllers/ (handles the request, decides what to do)
        → models/    (talks to the database)
          → config/db.js (the MySQL connection)
        → views/     (.ejs templates that render the HTML back)
```

Trace **one** feature end to end to learn the whole pattern. For example,
"add a pet":

- `routes/petRoutes.js` → `controllers/petController.js` → `models/petModel.js` → `views/newPet.ejs`

Once you have followed one feature, every other feature looks the same.

---

## 3. Getting started with Kiro

You do **not** need to configure anything to start. Open this folder in Kiro and
just talk to it. Work through these four phases in order.

### Phase 1 — Understand the code (no setup needed)

Before writing any code, use Kiro to understand what you are looking at. Paste
prompts like these into the chat:

- `Explain how this app is structured.`
- `Trace what happens when a user logs in, from route to database.`
- `How does a pet get booked for a service in this app?`
- `Where is image upload handled, and where do the files go?`
- `What does the middleware in middleware/auth.js do?`

This is the single most useful Kiro skill: understanding code you did not write.

### Phase 2 — Make small changes

Give Kiro small, clear tasks and review what it changes before accepting:

- `Add a date-of-birth field for pets (database, model, controller, and the newPet form).`
- `Add validation so a service booking date cannot be in the past.`
- `Show a friendly error message instead of "Failed to add pet." when adding a pet fails.`

Tips:
- Review every change as a diff before accepting it. Do not blindly trust output.
- If you want to approve changes piece by piece, switch Kiro to **Supervised**
  mode so each edit is shown as a hunk you accept or reject.
- If Kiro gets it wrong, tell it what is wrong and let it iterate — that is normal.

### Phase 3 — Give Kiro lasting context with steering

Open the `.kiro/steering/` folder. It contains two files that describe this
project so you do not have to re-explain it every time — Kiro reads them
automatically:

- `product.md` — what the app is, who uses it, and how it is structured.
- `tech.md` — the tech stack, how to run it, and the coding conventions to follow.

That is the whole idea of **steering**: write things down once so Kiro remembers
them. You can add more steering files of your own later, but these two are
enough to feel the benefit.

### Phase 4 — Try one small spec (optional / stretch)

For a feature big enough to be worth planning, start a **Spec** session. Kiro
will help you write requirements → design → tasks, then implement them. Try it
on something small, such as:

- `Add an optional "weight" field to the pet journal and show it in the journal list.`

The lesson here: use a spec when a feature is large enough to deserve planning.
For small changes, plain chat (Phase 2) is faster.

---

## 4. What you can ignore for now

Kiro has advanced features — **hooks**, **MCP servers**, and **custom agents**.
They are powerful but you do **not** need them for this module. Focus on Phases
1–4 above. You can explore the rest once you are comfortable.

---

## 5. One-line way to think about Kiro

> Treat Kiro like a fast junior engineer who has already read the whole codebase:
> ask it to explain things, give it small clear tasks, review what it does, and
> write things down (steering / specs) only when repeating yourself starts to hurt.
