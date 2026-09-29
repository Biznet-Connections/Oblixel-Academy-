const express = require('express');
const router = express.Router();
const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');
const ModuleProgress = require('../models/ModuleProgress');
const User = require('../models/User');
const authenticate = require('../middleware/auth');

// ==================== GET ALL COURSES ====================
router.get('/', async (req, res) => {
  try {
    const courses = await Course.find({ isActive: true })
      .sort({ displayOrder: 1, enrolledCount: -1 })
      .lean();

    const result = courses.map(c => ({
      id: c.courseId,
      courseId: c.courseId,
      name: c.name,
      abbreviation: c.abbreviation,
      level: c.level,
      description: c.description,
      price: c.price || c.examPrice || 0,
      examPrice: c.examPrice || c.price || 0,
      pathPrice: c.pathPrice || c.examPrice || 0,
      icon: c.icon,
      category: c.category,
      color: c.color,
      enrolledCount: c.enrolledCount,
      duration: c.duration,
      modules: c.totalModules,
      totalMinutes: c.totalMinutes || 0,
      bannerImage: c.bannerImage,
      prerequisite: c.prerequisite || null
    }));

    res.json({ courses: result });
  } catch (error) {
    console.error('[COURSES] Error:', error.message);
    res.status(500).json({ error: 'Failed to load courses' });
  }
});

// ==================== GET COURSE DETAILS (rich) ====================
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const course = await Course.findOne({ courseId: id.toLowerCase(), isActive: true });
    if (!course) return res.status(404).json({ error: 'Course not found' });

    const modules = course.modules.map(m => ({
      id: m.moduleId,
      moduleId: m.moduleId,
      name: m.name,
      description: m.description,
      complexity: m.complexity,
      estimatedMinutes: m.estimatedMinutes,
      duration: m.duration,
      contentType: m.contentType,
      videoUrl: m.videoUrl,
      imageUrl: m.imageUrl,
      icon: m.icon,
      keyTopics: m.keyTopics,
      learningObjectives: m.learningObjectives,
      xpReward: m.xpReward,
      prerequisites: m.prerequisites,
      passScore: m.passScore,
      quizQuestions: m.quizQuestions
    }));

    res.json({
      course: {
        id: course.courseId,
        courseId: course.courseId,
        name: course.name,
        abbreviation: course.abbreviation,
        level: course.level,
        description: course.description,
        longDescription: course.longDescription,
        price: course.price || course.examPrice || 0,
        examPrice: course.examPrice,
        pathPrice: course.pathPrice,
        icon: course.icon,
        bannerImage: course.bannerImage,
        category: course.category,
        color: course.color,
        duration: course.duration,
        totalModules: course.totalModules,
        totalMinutes: course.totalMinutes,
        enrolledCount: course.enrolledCount,
        learningOutcomes: course.learningOutcomes,
        careerPaths: course.careerPaths,
        prerequisite: course.prerequisite
      },
      modules,
      totalModules: course.totalModules,
      totalMinutes: course.totalMinutes
    });
  } catch (error) {
    console.error('[COURSES] Error:', error.message);
    res.status(500).json({ error: 'Failed to load course details' });
  }
});

// ==================== GET MODULE PROGRESS (rich) ====================
router.get('/:id/progress', authenticate, async (req, res) => {
  const { id } = req.params;
  const userId = req.user._id;

  try {
    const course = await Course.findOne({ courseId: id.toLowerCase() });
    if (!course) return res.status(404).json({ error: 'Course not found' });

    const progressDocs = await ModuleProgress.find({ userId, courseId: id.toLowerCase() });
    const progressMap = {};
    progressDocs.forEach(p => { progressMap[p.moduleId] = p; });

    const completedModuleIds = progressDocs.filter(p => p.completed).map(p => p.moduleId);
    const totalModules = course.totalModules;

    let totalXPEarned = 0;
    let totalTimeSpent = 0;

    const modulesStatus = [];
    for (let i = 1; i <= totalModules; i++) {
      const courseModule = course.modules.find(m => m.moduleId === i);
      const prog = progressMap[i] || {};

      // Unlock logic: first module always unlocked; otherwise previous must be completed
      const previousDone = i === 1 || completedModuleIds.includes(i - 1);
      // Also check explicit prerequisites if present
      const prereqMet = (courseModule?.prerequisites || []).every(p => completedModuleIds.includes(p));
      const unlocked = i === 1 || (previousDone && prereqMet);

      const completed = !!prog.completed;
      if (completed) totalXPEarned += prog.xpEarned || courseModule?.xpReward || 0;
      totalTimeSpent += prog.timeSpent || 0;

      modulesStatus.push({
        moduleId: i,
        name: courseModule?.name || `Module ${i}`,
        complexity: courseModule?.complexity || 'Beginner',
        estimatedMinutes: courseModule?.estimatedMinutes || 30,
        xpReward: courseModule?.xpReward || 50,
        icon: courseModule?.icon || 'fa-book',
        imageUrl: courseModule?.imageUrl || '',
        completed,
        unlocked,
        bookmarked: !!prog.bookmarked,
        quizScore: prog.quizScore ?? null,
        bestScore: prog.bestScore ?? null,
        attempts: prog.attempts || 0,
        practiceAttempts: prog.practiceAttempts || 0,
        timeSpent: prog.timeSpent || 0,
        lastAccessed: prog.lastAccessed || null,
        hasNotes: !!(prog.notes && prog.notes.trim()),
        completedAt: prog.completedAt || null
      });
    }

    const completedCount = completedModuleIds.length;
    const examUnlocked = completedCount >= totalModules && totalModules > 0;

    // Next module
    let nextModuleId = null;
    let nextModuleName = null;
    const next = modulesStatus.find(m => m.unlocked && !m.completed);
    if (next) {
      nextModuleId = next.moduleId;
      nextModuleName = next.name;
    }

    res.json({
      progress: {
        courseId: id,
        completedCount,
        totalModules,
        modules: modulesStatus,
        examUnlocked,
        nextModuleId,
        nextModuleName: nextModuleName || (examUnlocked ? 'Final Exam Ready!' : 'Continue learning'),
        percentComplete: totalModules > 0 ? Math.round((completedCount / totalModules) * 100) : 0,
        totalXPEarned,
        totalTimeSpent, // seconds
        courseName: course.name,
        courseIcon: course.icon,
        bannerImage: course.bannerImage,
        totalMinutes: course.totalMinutes
      }
    });
  } catch (error) {
    console.error('[COURSES] Progress error:', error.message);
    res.status(500).json({ error: 'Failed to load progress' });
  }
});

// ==================== GET SINGLE MODULE PROGRESS (with notes) ====================
router.get('/:id/modules/:moduleId/progress', authenticate, async (req, res) => {
  const { id, moduleId } = req.params;
  const userId = req.user._id;

  try {
    const course = await Course.findOne({ courseId: id.toLowerCase() });
    if (!course) return res.status(404).json({ error: 'Course not found' });

    const courseModule = course.modules.find(m => m.moduleId === parseInt(moduleId));
    if (!courseModule) return res.status(404).json({ error: 'Module not found' });

    const progress = await ModuleProgress.findOne({
      userId,
      courseId: id.toLowerCase(),
      moduleId: parseInt(moduleId)
    }).lean();

    res.json({
      module: courseModule,
      progress: progress || {
        completed: false,
        quizScore: null,
        notes: '',
        timeSpent: 0,
        bookmarked: false,
        attempts: 0,
        practiceAttempts: 0
      }
    });
  } catch (error) {
    console.error('[COURSES] Module progress error:', error.message);
    res.status(500).json({ error: 'Failed to load module' });
  }
});

// ==================== SAVE NOTES ====================
router.post('/:id/modules/:moduleId/notes', authenticate, async (req, res) => {
  const { id, moduleId } = req.params;
  const { notes } = req.body;
  const userId = req.user._id;

  try {
    const progress = await ModuleProgress.findOneAndUpdate(
      { userId, courseId: id.toLowerCase(), moduleId: parseInt(moduleId) },
      {
        $set: {
          notes: (notes || '').substring(0, 50000), // 50k char cap
          notesUpdatedAt: new Date(),
          lastAccessed: new Date()
        }
      },
      { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
    );

    res.json({ success: true, savedAt: progress.notesUpdatedAt });
  } catch (error) {
    console.error('[COURSES] Save notes error:', error.message);
    res.status(500).json({ error: 'Failed to save notes' });
  }
});

// ==================== TRACK STUDY TIME ====================
router.post('/:id/modules/:moduleId/time', authenticate, async (req, res) => {
  const { id, moduleId } = req.params;
  const { seconds } = req.body;
  const userId = req.user._id;

  if (!seconds || seconds < 1 || seconds > 3600) {
    return res.status(400).json({ error: 'Invalid seconds (1-3600)' });
  }

  try {
    await ModuleProgress.findOneAndUpdate(
      { userId, courseId: id.toLowerCase(), moduleId: parseInt(moduleId) },
      {
        $inc: { timeSpent: parseInt(seconds) },
        $set: { lastAccessed: new Date() }
      },
      { upsert: true, setDefaultsOnInsert: true }
    );

    res.json({ success: true });
  } catch (error) {
    console.error('[COURSES] Track time error:', error.message);
    res.status(500).json({ error: 'Failed to track time' });
  }
});

// ==================== TOGGLE BOOKMARK ====================
router.post('/:id/modules/:moduleId/bookmark', authenticate, async (req, res) => {
  const { id, moduleId } = req.params;
  const userId = req.user._id;

  try {
    const existing = await ModuleProgress.findOne({
      userId, courseId: id.toLowerCase(), moduleId: parseInt(moduleId)
    });

    const newValue = existing ? !existing.bookmarked : true;

    await ModuleProgress.findOneAndUpdate(
      { userId, courseId: id.toLowerCase(), moduleId: parseInt(moduleId) },
      { $set: { bookmarked: newValue } },
      { upsert: true, setDefaultsOnInsert: true }
    );

    res.json({ success: true, bookmarked: newValue });
  } catch (error) {
    console.error('[COURSES] Bookmark error:', error.message);
    res.status(500).json({ error: 'Failed to bookmark' });
  }
});

// ==================== COMPLETE MODULE (upgraded) ====================
router.post('/:id/modules/:moduleId/complete', authenticate, async (req, res) => {
  const { id, moduleId } = req.params;
  const { quizScore, isPractice } = req.body;
  const userId = req.user._id;

  if (quizScore === undefined || quizScore === null) {
    return res.status(400).json({ error: 'Quiz score is required' });
  }

  const score = parseInt(quizScore);
  const mid = parseInt(moduleId);

  try {
    const course = await Course.findOne({ courseId: id.toLowerCase() });
    if (!course) return res.status(404).json({ error: 'Course not found' });

    const courseModule = course.modules.find(m => m.moduleId === mid);
    const xpReward = courseModule?.xpReward || 50;
    const passScore = courseModule?.passScore || 70;

    // Practice mode — don't mark complete, just track attempt
    if (isPractice) {
      await ModuleProgress.findOneAndUpdate(
        { userId, courseId: id.toLowerCase(), moduleId: mid },
        {
          $inc: { practiceAttempts: 1 },
          $set: { lastAccessed: new Date() }
        },
        { upsert: true, setDefaultsOnInsert: true }
      );
      return res.json({ success: true, practice: true, score });
    }

    const existing = await ModuleProgress.findOne({
      userId, courseId: id.toLowerCase(), moduleId: mid
    });

    const wasCompleted = existing?.completed || false;
    const previouslyEarnedXP = existing?.xpEarned || 0;
    const passed = score >= passScore;
    const bestScore = Math.max(score, existing?.bestScore || 0);

    // XP awarded only on first pass
    let xpToAward = 0;
    if (passed && !wasCompleted) xpToAward = xpReward;

    await ModuleProgress.findOneAndUpdate(
      { userId, courseId: id.toLowerCase(), moduleId: mid },
      {
        $set: {
          completed: passed ? true : (wasCompleted ? true : false),
          quizScore: score,
          bestScore,
          completedAt: passed && !wasCompleted ? new Date() : (existing?.completedAt || null),
          lastAccessed: new Date(),
          xpEarned: previouslyEarnedXP + xpToAward
        },
        $inc: { attempts: 1 }
      },
      { upsert: true, setDefaultsOnInsert: true, returnDocument: 'after' }
    );

    // Update user XP if awarded
    if (xpToAward > 0) {
      const user = await User.findById(userId);
      if (user) {
        user.xp = (user.xp || 0) + xpToAward;
        // Level = floor(xp / 500) + 1
        user.level = Math.floor(user.xp / 500) + 1;
        await user.save();
      }
    }

    // Recompute course completion
    const completedCount = await ModuleProgress.countDocuments({
      userId, courseId: id.toLowerCase(), completed: true
    });

    const progressPercent = Math.round((completedCount / course.totalModules) * 100);
    const examUnlocked = completedCount >= course.totalModules;

    let nextModuleName = null;
    if (completedCount < course.totalModules) {
      const nextModule = course.modules.find(m => m.moduleId === completedCount + 1);
      nextModuleName = nextModule ? nextModule.name : `Module ${completedCount + 1}`;
    }

    await Enrollment.findOneAndUpdate(
      { userId, courseId: id.toLowerCase() },
      {
        $set: {
          progress: progressPercent,
          'moduleProgress.completedCount': completedCount,
          'moduleProgress.totalModules': course.totalModules,
          'moduleProgress.nextModuleName': nextModuleName || 'Final Exam Ready!',
          'moduleProgress.examUnlocked': examUnlocked
        }
      }
    );

    res.json({
      success: true,
      passed,
      score,
      bestScore,
      xpAwarded: xpToAward,
      examUnlocked,
      completedCount,
      totalModules: course.totalModules,
      message: passed
        ? `Module ${mid} completed! Score: ${score}% · +${xpToAward} XP`
        : `Score ${score}% — need ${passScore}% to pass. Try again!`
    });
  } catch (error) {
    console.error('[COURSES] Complete module error:', error.message);
    res.status(500).json({ error: 'Failed to complete module' });
  }
});

// ==================== GET USER ENROLLMENTS ====================
router.get('/enrollments/me', authenticate, async (req, res) => {
  try {
    const enrollments = await Enrollment.find({ userId: req.user._id }).sort({ createdAt: -1 });

    const result = await Promise.all(enrollments.map(async (enrollment) => {
      const completedCount = await ModuleProgress.countDocuments({
        userId: req.user._id,
        courseId: enrollment.courseId,
        completed: true
      });

      const course = await Course.findOne({ courseId: enrollment.courseId });
      const totalModules = course ? course.totalModules : enrollment.moduleProgress?.totalModules || 8;
      const examUnlocked = completedCount >= totalModules;

      let nextModuleName = null;
      if (completedCount < totalModules && course) {
        const nextModule = course.modules.find(m => m.moduleId === completedCount + 1);
        nextModuleName = nextModule ? nextModule.name : `Module ${completedCount + 1}`;
      }

      return {
        courseId: enrollment.courseId,
        courseName: enrollment.courseName,
        courseIcon: enrollment.courseIcon,
        type: enrollment.type,
        status: enrollment.status,
        progress: totalModules > 0 ? Math.round((completedCount / totalModules) * 100) : 0,
        moduleProgress: {
          completedCount,
          totalModules,
          examUnlocked,
          nextModuleName: nextModuleName || (examUnlocked ? 'Final Exam Ready!' : 'Continue learning')
        },
        examAttempts: enrollment.examAttempts,
        score: enrollment.score,
        enrolledAt: enrollment.createdAt
      };
    }));

    res.json({ enrollments: result });
  } catch (error) {
    console.error('[COURSES] Enrollments error:', error.message);
    res.status(500).json({ error: 'Failed to load enrollments' });
  }
});


// ==================== GET MODULE QUIZ ====================
// Returns the quiz questions for a specific module (shuffled options optional)
router.get('/:id/modules/:moduleId/quiz', authenticate, async (req, res) => {
  const { id, moduleId } = req.params;

  try {
    const course = await Course.findOne({ courseId: id.toLowerCase() });
    if (!course) return res.status(404).json({ error: 'Course not found' });

    const courseModule = course.modules.find(m => m.moduleId === parseInt(moduleId));
    if (!courseModule) return res.status(404).json({ error: 'Module not found' });

    // Check enrollment
    const enrollment = await Enrollment.findOne({ userId: req.user._id, courseId: id.toLowerCase() });
    if (!enrollment) return res.status(403).json({ error: 'Not enrolled in this course' });

    // Load questions from ExamQuestion
    const ExamQuestion = require('../models/ExamQuestion');
    const questions = await ExamQuestion.find({
      courseId: id.toLowerCase(),
      moduleId: parseInt(moduleId),
      isActive: { $ne: false }
    }).lean();

    if (!questions.length) {
      return res.json({ questions: [], message: 'No quiz questions available for this module yet.' });
    }

    // Shuffle questions
    const shuffled = questions.sort(() => Math.random() - 0.5);

    // Strip correct answer (unless practice mode)
    const isPractice = req.query.practice === '1';
    const payload = shuffled.map(q => ({
      id: q._id,
      text: q.text,
      options: q.options,
      correct: isPractice ? q.correct : undefined
    }));

    res.json({ questions: payload, total: payload.length });
  } catch (error) {
    console.error('[QUIZ] Get quiz error:', error.message);
    res.status(500).json({ error: 'Failed to load quiz' });
  }
});

// ==================== SUBMIT MODULE QUIZ ====================
// Grades the quiz, saves score, marks module complete if passed
router.post('/:id/modules/:moduleId/quiz/submit', authenticate, async (req, res) => {
  const { id, moduleId } = req.params;
  const { answers, isPractice } = req.body;
  // answers: { questionId: selectedIndex, ... }

  if (!answers || typeof answers !== 'object') {
    return res.status(400).json({ error: 'Answers required' });
  }

  try {
    const course = await Course.findOne({ courseId: id.toLowerCase() });
    if (!course) return res.status(404).json({ error: 'Course not found' });

    const courseModule = course.modules.find(m => m.moduleId === parseInt(moduleId));
    if (!courseModule) return res.status(404).json({ error: 'Module not found' });

    const ExamQuestion = require('../models/ExamQuestion');
    const questions = await ExamQuestion.find({
      courseId: id.toLowerCase(),
      moduleId: parseInt(moduleId),
      isActive: { $ne: false }
    }).lean();

    if (!questions.length) return res.status(404).json({ error: 'No questions available' });

    // Grade
    let correct = 0;
    let attempted = 0;
    questions.forEach(q => {
      const ans = answers[String(q._id)];
      if (ans !== undefined && ans !== null) {
        attempted++;
        if (parseInt(ans) === q.correct) correct++;
      }
    });

    const score = Math.round((correct / questions.length) * 100);
    const passScore = courseModule.passScore || 70;
    const passed = score >= passScore;

    // Practice mode — don't mark complete, just track attempt
    if (isPractice) {
      await ModuleProgress.findOneAndUpdate(
        { userId: req.user._id, courseId: id.toLowerCase(), moduleId: parseInt(moduleId) },
        { $inc: { practiceAttempts: 1 }, $set: { lastAccessed: new Date() } },
        { upsert: true, setDefaultsOnInsert: true }
      );
      return res.json({
        success: true,
        practice: true,
        score,
        correct,
        total: questions.length,
        passed,
        passScore
      });
    }

    // Real quiz — save + possibly mark complete
    const mid = parseInt(moduleId);
    const existing = await ModuleProgress.findOne({
      userId: req.user._id, courseId: id.toLowerCase(), moduleId: mid
    });

    const wasCompleted = existing?.completed || false;
    const previouslyEarnedXP = existing?.xpEarned || 0;
    const xpReward = courseModule.xpReward || 50;
    const bestScore = Math.max(score, existing?.bestScore || 0);

    let xpToAward = 0;
    if (passed && !wasCompleted) xpToAward = xpReward;

    await ModuleProgress.findOneAndUpdate(
      { userId: req.user._id, courseId: id.toLowerCase(), moduleId: mid },
      {
        $set: {
          completed: passed ? true : (wasCompleted ? true : false),
          quizScore: score,
          bestScore,
          completedAt: passed && !wasCompleted ? new Date() : (existing?.completedAt || null),
          lastAccessed: new Date(),
          xpEarned: previouslyEarnedXP + xpToAward
        },
        $inc: { attempts: 1 }
      },
      { upsert: true, setDefaultsOnInsert: true, returnDocument: 'after' }
    );

    // Update user XP
    if (xpToAward > 0) {
      const user = await User.findById(req.user._id);
      if (user) {
        user.xp = (user.xp || 0) + xpToAward;
        user.level = Math.floor(user.xp / 500) + 1;
        await user.save();
      }
    }

    // Update enrollment progress
    const completedCount = await ModuleProgress.countDocuments({
      userId: req.user._id, courseId: id.toLowerCase(), completed: true
    });
    const progressPercent = Math.round((completedCount / course.totalModules) * 100);
    const examUnlocked = completedCount >= course.totalModules;

    let nextModuleName = null;
    if (completedCount < course.totalModules) {
      const nextModule = course.modules.find(m => m.moduleId === completedCount + 1);
      nextModuleName = nextModule ? nextModule.name : `Module ${completedCount + 1}`;
    }

    await Enrollment.findOneAndUpdate(
      { userId: req.user._id, courseId: id.toLowerCase() },
      {
        $set: {
          progress: progressPercent,
          'moduleProgress.completedCount': completedCount,
          'moduleProgress.totalModules': course.totalModules,
          'moduleProgress.nextModuleName': nextModuleName || 'Final Exam Ready!',
          'moduleProgress.examUnlocked': examUnlocked
        }
      }
    );

    res.json({
      success: true,
      score,
      correct,
      total: questions.length,
      passed,
      passScore,
      xpAwarded: xpToAward,
      examUnlocked,
      completedCount,
      totalModules: course.totalModules,
      message: passed
        ? `Module passed! Score: ${score}% · +${xpToAward} XP`
        : `Score: ${score}% — need ${passScore}% to pass`
    });
  } catch (error) {
    console.error('[QUIZ] Submit error:', error.message);
    res.status(500).json({ error: 'Failed to submit quiz' });
  }
});

// ==================== MARK LESSON AS READ ====================
router.post('/:id/modules/:moduleId/read', authenticate, async (req, res) => {
  const { id, moduleId } = req.params;
  try {
    const ModuleProgress = require('../models/ModuleProgress');
    await ModuleProgress.findOneAndUpdate(
      { userId: req.user._id, courseId: id.toLowerCase(), moduleId: parseInt(moduleId) },
      { $set: { lessonRead: true, lastAccessed: new Date() } },
      { upsert: true, setDefaultsOnInsert: true }
    );
    res.json({ success: true });
  } catch (error) {
    console.error('[COURSES] Mark read error:', error.message);
    res.status(500).json({ error: 'Failed to mark lesson as read' });
  }
});
module.exports = router;
