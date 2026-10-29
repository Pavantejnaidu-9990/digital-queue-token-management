const express = require("express");
const fs = require("fs");
const path = require("path");

const router = express.Router();
const tokensFile = path.join(__dirname, "..", "data", "tokens.json");

function readTokens() {
    try {
        if (!fs.existsSync(tokensFile)) fs.writeFileSync(tokensFile, "[]");
        const raw = fs.readFileSync(tokensFile, "utf8").trim();
        const tokens = raw ? JSON.parse(raw) : [];

        return tokens.map((token) => ({
            ...token,
            id: String(token.id),
            serviceId: String(token.serviceId),
            status: String(token.status || "waiting").toLowerCase(),
            date: token.date || (token.createdAt ? token.createdAt.slice(0, 10) : "")
        }));
    } catch (error) {
        console.error("Token read error:", error);
        return [];
    }
}

function writeTokens(tokens) {
    fs.writeFileSync(tokensFile, JSON.stringify(tokens, null, 2));
}

function localDate() {
    const now = new Date();
    const offset = now.getTimezoneOffset() * 60000;
    return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

function sortByCreatedAt(a, b) {
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
}

router.get("/current", (req, res) => {
    const tokens = readTokens();
    const serviceId = req.query.serviceId ? String(req.query.serviceId) : null;

    const currentToken = tokens.find((token) =>
        token.status === "serving" &&
        (!serviceId || token.serviceId === serviceId)
    ) || null;

    res.json({ success: true, currentToken });
});

router.get("/queue", (req, res) => {
    const tokens = readTokens();
    const serviceId = req.query.serviceId ? String(req.query.serviceId) : null;

    const queue = tokens
        .filter((token) =>
            token.status === "waiting" &&
            (!serviceId || token.serviceId === serviceId)
        )
        .sort(sortByCreatedAt);

    res.json({ success: true, queue });
});

router.put("/next", (req, res) => {
    const serviceId = req.body.serviceId ? String(req.body.serviceId) : "";

    if (!serviceId) {
        return res.status(400).json({
            success: false,
            message: "Please select a service."
        });
    }

    const tokens = readTokens();

    const currentToken = tokens.find(
        (token) => token.serviceId === serviceId && token.status === "serving"
    );

    if (currentToken) {
        currentToken.status = "completed";
        currentToken.completedAt = new Date().toISOString();
    }

    const nextToken = tokens
        .filter((token) => token.serviceId === serviceId && token.status === "waiting")
        .sort(sortByCreatedAt)[0];

    if (!nextToken) {
        writeTokens(tokens);
        return res.json({
            success: true,
            message: currentToken
                ? `${currentToken.tokenNumber} completed. No waiting tokens.`
                : "No waiting tokens for this service.",
            currentToken: null
        });
    }

    nextToken.status = "serving";
    nextToken.calledAt = new Date().toISOString();

    writeTokens(tokens);

    res.json({
        success: true,
        message: `Now serving ${nextToken.tokenNumber}`,
        currentToken: nextToken
    });
});

// Change the status of the currently serving token without needing to call another token.
router.put("/action", (req, res) => {
    const serviceId = req.body.serviceId ? String(req.body.serviceId) : "";
    const action = String(req.body.action || "").toLowerCase();
    const allowed = ["complete", "skip", "cancel"];

    if (!serviceId) {
        return res.status(400).json({ success: false, message: "Please select a service." });
    }
    if (!allowed.includes(action)) {
        return res.status(400).json({
            success: false,
            message: "Invalid action. Use complete, skip or cancel."
        });
    }

    const tokens = readTokens();
    const index = tokens.findIndex(
        (token) => token.serviceId === serviceId && token.status === "serving"
    );

    if (index === -1) {
        return res.status(404).json({
            success: false,
            message: "There is no token currently being served for this service."
        });
    }

    const token = tokens[index];
    token.status = action === "complete" ? "completed" : action === "skip" ? "skipped" : "cancelled";

    const now = new Date().toISOString();
    if (token.status === "completed") token.completedAt = now;
    if (token.status === "skipped") token.skippedAt = now;
    if (token.status === "cancelled") token.cancelledAt = now;

    writeTokens(tokens);

    res.json({
        success: true,
        message: `${token.tokenNumber} marked as ${token.status}.`,
        token
    });
});

router.get("/statistics", (req, res) => {
    const tokens = readTokens();
    const today = localDate();
    const serviceId = req.query.serviceId ? String(req.query.serviceId) : null;

    const todayTokens = tokens.filter((token) =>
        token.date === today &&
        (!serviceId || token.serviceId === serviceId)
    );

    const statistics = {
        total: todayTokens.length,
        waiting: todayTokens.filter((token) => token.status === "waiting").length,
        serving: todayTokens.filter((token) => token.status === "serving").length,
        completed: todayTokens.filter((token) => token.status === "completed").length,
        cancelled: todayTokens.filter((token) => token.status === "cancelled").length,
        skipped: todayTokens.filter((token) => token.status === "skipped").length
    };

    res.json({ success: true, date: today, statistics });
});

module.exports = router;
