import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import vendorCategoriesRouter from "./vendorCategories";
import vendorsRouter from "./vendors";
import purchaseRequestsRouter from "./purchaseRequests";
import dashboardRouter from "./dashboard";
import reportsRouter from "./reports";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);

// All routes below require authentication
router.use(requireAuth);
router.use(vendorCategoriesRouter);
router.use(vendorsRouter);
router.use(purchaseRequestsRouter);
router.use(dashboardRouter);
router.use(reportsRouter);

export default router;
