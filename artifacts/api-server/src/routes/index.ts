import { Router, type IRouter } from "express";
import healthRouter from "./health";
import campusRouter from "./campus";
import tasksRouter from "./tasks";

const router: IRouter = Router();

router.use(healthRouter);
router.use(campusRouter);
router.use(tasksRouter);

export default router;
