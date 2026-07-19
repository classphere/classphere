import { Router } from "express";
import { getCanonicalSyllabus } from "./syllabus.controller";

const router = Router();

// Official syllabus structure is public reference data, not tenant material.
router.get("/:examCode", getCanonicalSyllabus);

export default router;
