const express = require("express");
const path = require("path");
const fs = require("fs");

const tokenRoutes = require("./routes/tokenRoutes");
const serviceRoutes = require("./routes/serviceRoutes");
const adminRoutes = require("./routes/adminRoutes");

const app = express();
const PORT = Number(process.env.PORT) || 3000;

const dataFolder = path.join(__dirname, "data");

function ensureFile(file, defaultValue = []) {
    if (!fs.existsSync(file)) {
        fs.writeFileSync(file, JSON.stringify(defaultValue, null, 2));
    }
}

if (!fs.existsSync(dataFolder)) {
    fs.mkdirSync(dataFolder, { recursive: true });
}

ensureFile(path.join(dataFolder, "services.json"));
ensureFile(path.join(dataFolder, "tokens.json"));

app.use(express.json({ limit: "100kb" }));
app.use(express.urlencoded({ extended: true }));

// Protect administrative pages and endpoints with HTTP Basic Auth. Configure
// ADMIN_USERNAME and ADMIN_PASSWORD in the hosting provider's environment.
function requireAdmin(req, res, next) {
    const username = process.env.ADMIN_USERNAME;
    const password = process.env.ADMIN_PASSWORD;

    if (!username || !password) {
        return res.status(503).send("Admin access is not configured. Set ADMIN_USERNAME and ADMIN_PASSWORD.");
    }

    const header = req.headers.authorization || "";
    const [scheme, encoded] = header.split(" ");
    if (scheme !== "Basic" || !encoded) {
        res.set("WWW-Authenticate", 'Basic realm="QueueFlow Admin", charset="UTF-8"');
        return res.status(401).send("Authentication required.");
    }

    let credentials;
    try {
        credentials = Buffer.from(encoded, "base64").toString("utf8");
    } catch {
        credentials = "";
    }
    const separator = credentials.indexOf(":");
    const suppliedUser = separator >= 0 ? credentials.slice(0, separator) : "";
    const suppliedPassword = separator >= 0 ? credentials.slice(separator + 1) : "";

    // Compare equal-length buffers with timingSafeEqual to avoid a simple
    // character-by-character credential comparison.
    const crypto = require("crypto");
    const safeEqual = (a, b) => {
        const left = Buffer.from(String(a));
        const right = Buffer.from(String(b));
        return left.length === right.length && crypto.timingSafeEqual(left, right);
    };

    if (!safeEqual(suppliedUser, username) || !safeEqual(suppliedPassword, password)) {
        res.set("WWW-Authenticate", 'Basic realm="QueueFlow Admin", charset="UTF-8"');
        return res.status(401).send("Invalid admin credentials.");
    }
    next();
}

// Protect the admin UI and all admin API routes. Protect service management
// because adding/removing services changes the live queue configuration.
app.use((req, res, next) => {
    const isAdminPage = req.path === "/admin.html";
    const isServicesPage = req.path === "/services.html";
    const isAdminApi = req.path === "/api/admin" || req.path.startsWith("/api/admin/");
    const isServiceMutation = req.path === "/api/services" && ["POST", "DELETE"].includes(req.method);
    if (isAdminPage || isServicesPage || isAdminApi || isServiceMutation) {
        return requireAdmin(req, res, next);
    }
    next();
});

app.use(express.static(path.join(__dirname, "public")));

app.use("/api/tokens", tokenRoutes);
app.use("/api/services", serviceRoutes);
app.use("/api/admin", adminRoutes);

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.use("/api", (req, res) => {
    res.status(404).json({
        success: false,
        message: "API endpoint not found"
    });
});

app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({
        success: false,
        message: "Internal server error"
    });
});

const server = app.listen(PORT, () => {
    console.log(`QueueFlow running at http://localhost:${PORT}`);
});

server.on("error", (error) => {
    if (error.code === "EADDRINUSE") {
        console.error(`Port ${PORT} is already in use. Stop the other Node.js process or run with a different PORT.`);
        process.exit(1);
    }
    console.error("Server error:", error);
    process.exit(1);
});
