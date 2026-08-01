const express = require("express");

const router = express.Router();

const dashboardService = require("../services/dashboardService");

// =====================================================
// DASHBOARD
// =====================================================

router.get(
    "/",
    dashboardService.carregarDashboard
);

module.exports = router;