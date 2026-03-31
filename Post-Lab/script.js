/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║    InterviewIQ — AI Smart Interview & Proctoring System     ║
 * ║    JavaScript Core: Question Engine · Proctoring · Scoring  ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * Architecture:
 *  1. QuestionEngine     — AI-simulated adaptive question generation
 *  2. ProctoringSystem   — Camera, tab-switch, hysteresis detection
 *  3. AnswerProcessor    — NLP-simulated keyword scoring
 *  4. FeedbackEngine     — Multi-dimensional report generation
 *  5. UIController       — Section transitions, DOM management
 *  6. VoiceHandler       — Web Speech API integration
 */

"use strict";

/* ═══════════════════════════════════════════════════════════════
   ① CONSTANTS & CONFIGURATION
═══════════════════════════════════════════════════════════════ */

const CONFIG = {
  totalQuestions: 7,
  tabSwitchThreshold: 2,      // warnings after N switches (hysteresis)
  tabSwitchDangerThreshold: 4,
  answerMinWords: 20,
  answerGoodWords: 80,
  timerWarningAt: 120,        // seconds
};

/** Role-specific keyword banks for NLP simulation */
const ROLE_KEYWORDS = {
  data_scientist: [
    "machine learning","deep learning","python","pandas","numpy","scikit-learn",
    "tensorflow","pytorch","regression","classification","clustering","neural network",
    "feature engineering","data preprocessing","model evaluation","cross-validation",
    "overfitting","underfitting","bias","variance","random forest","gradient boosting",
    "sql","statistics","hypothesis testing","a/b testing","visualization","matplotlib"
  ],
  ml_engineer: [
    "mlops","pipeline","model deployment","docker","kubernetes","fastapi","flask",
    "ci/cd","model monitoring","data drift","feature store","training","inference",
    "latency","scalability","rest api","microservices","aws","gcp","azure","airflow",
    "kubeflow","mlflow","experiment tracking","model versioning","python","spark"
  ],
  software_engineer: [
    "algorithms","data structures","time complexity","space complexity","oop","solid",
    "design patterns","rest","graphql","databases","sql","nosql","caching","redis",
    "microservices","api","testing","unit test","integration","ci/cd","git","agile",
    "scrum","python","java","javascript","system design","scalability","distributed"
  ],
  frontend_developer: [
    "react","vue","angular","javascript","typescript","html","css","dom","accessibility",
    "responsive","performance","webpack","vite","state management","redux","hooks",
    "component","api","rest","graphql","testing","jest","cypress","web vitals",
    "lighthouse","seo","animations","css grid","flexbox","sass","tailwind"
  ],
  backend_developer: [
    "node.js","python","java","go","rest api","graphql","database","postgresql","mysql",
    "mongodb","redis","caching","authentication","jwt","oauth","microservices","docker",
    "kubernetes","ci/cd","testing","message queue","kafka","rabbitmq","scalability",
    "performance","security","orm","sql","nosql","server","http","websocket"
  ],
  data_analyst: [
    "sql","excel","python","r","tableau","power bi","visualization","dashboard","kpi",
    "metrics","statistics","a/b testing","cohort analysis","funnel","retention",
    "data cleaning","etl","pivot","vlookup","regression","correlation","hypothesis",
    "business intelligence","reporting","storytelling","insights","pandas","numpy"
  ],
  devops_engineer: [
    "docker","kubernetes","ci/cd","jenkins","github actions","terraform","ansible",
    "aws","gcp","azure","linux","bash","python","monitoring","prometheus","grafana",
    "logging","elk stack","nginx","load balancer","ssl","security","networking",
    "infrastructure as code","helm","argocd","gitops","scalability","reliability"
  ],
  product_manager: [
    "roadmap","stakeholder","user story","backlog","agile","scrum","prioritization",
    "okr","kpi","metrics","user research","a/b testing","mvp","product strategy",
    "go to market","competitive analysis","product discovery","wireframe","prototyping",
    "customer feedback","analytics","data driven","cross-functional","communication"
  ],
};

/** Question templates per role and difficulty */
const QUESTION_BANK = {
  data_scientist: {
    junior: [
      { q: "Can you explain the difference between supervised and unsupervised learning? Provide examples of each.", tag: "Conceptual" },
      { q: "What is overfitting in machine learning? How would you detect and address it?", tag: "Technical" },
      { q: "Explain the bias-variance tradeoff. Why is it important for model building?", tag: "Technical" },
      { q: "Walk me through how you would clean a dataset that contains missing values, duplicates, and outliers.", tag: "Practical" },
      { q: "What evaluation metrics would you use for a binary classification problem? When would you prefer F1-score over accuracy?", tag: "Technical" },
      { q: "Describe a data project you've worked on. What was your approach and what challenges did you face?", tag: "Behavioral" },
      { q: "Why is feature scaling important? When is it necessary and when can it be skipped?", tag: "Technical" },
    ],
    mid: [
      { q: "Compare Random Forest and Gradient Boosting. In what scenarios would you prefer one over the other?", tag: "Advanced" },
      { q: "Explain how cross-validation works. Why is k-fold cross-validation generally preferred over a simple train-test split?", tag: "Technical" },
      { q: "You have an imbalanced dataset with 95% class A and 5% class B. What strategies would you use to address this?", tag: "Problem-Solving" },
      { q: "Describe the concept of regularization. Compare L1 (Lasso) and L2 (Ridge) and explain when to use each.", tag: "Technical" },
      { q: "How would you approach building a recommendation system from scratch? Discuss collaborative filtering vs. content-based approaches.", tag: "System Design" },
      { q: "Tell me about a time you had to communicate complex model results to non-technical stakeholders. How did you approach it?", tag: "Behavioral" },
      { q: "What are the key assumptions of linear regression? How would you validate them?", tag: "Conceptual" },
    ],
    senior: [
      { q: "Design a large-scale ML pipeline for real-time fraud detection processing 1M+ transactions per day. Discuss architecture, feature engineering, and model serving.", tag: "System Design" },
      { q: "How would you design an A/B testing framework for evaluating model performance in production? Address statistical significance, experimentation design, and pitfalls.", tag: "Advanced" },
      { q: "Explain the mathematical intuition behind attention mechanisms in transformers. How has this influenced modern NLP?", tag: "Deep Technical" },
      { q: "You detect that your production model's performance has degraded. Walk me through your systematic debugging and remediation approach.", tag: "Problem-Solving" },
      { q: "Discuss trade-offs between model interpretability and performance. How do techniques like SHAP, LIME help bridge this gap?", tag: "Advanced" },
      { q: "Describe your strategy for handling catastrophic forgetting in continual learning scenarios.", tag: "Research" },
      { q: "How would you lead a team to migrate from a monolithic ML architecture to microservices-based model serving?", tag: "Leadership" },
    ],
  },

  ml_engineer: {
    junior: [
      { q: "What is the difference between model training and model inference? How are the infrastructure requirements different?", tag: "Technical" },
      { q: "Explain how you would containerize a machine learning model using Docker.", tag: "Practical" },
      { q: "What is a REST API? How would you expose a trained model as an API endpoint?", tag: "Technical" },
      { q: "Describe the components of an ML pipeline. What tools have you used for pipeline orchestration?", tag: "Practical" },
      { q: "What is model drift? How would you monitor for it in production?", tag: "Conceptual" },
      { q: "Walk me through how you would set up a basic CI/CD pipeline for an ML project.", tag: "Technical" },
      { q: "Tell me about an ML project you've deployed or contributed to. What were the key technical challenges?", tag: "Behavioral" },
    ],
    mid: [
      { q: "Compare different model serving strategies: batch inference, real-time API, and streaming. When would you use each?", tag: "System Design" },
      { q: "How do you manage model versioning and experiment tracking? What tools do you prefer and why?", tag: "Technical" },
      { q: "Describe how you would design a feature store. What are the benefits over ad-hoc feature engineering?", tag: "System Design" },
      { q: "You need to reduce model inference latency from 500ms to 50ms. What optimization strategies would you explore?", tag: "Problem-Solving" },
      { q: "Explain the difference between blue-green deployment and canary releases in the context of ML model updates.", tag: "Technical" },
      { q: "How would you implement model monitoring and alerting for a production recommendation system?", tag: "Practical" },
      { q: "Tell me about a time a deployed model caused an incident. How did you diagnose and resolve it?", tag: "Behavioral" },
    ],
    senior: [
      { q: "Design a scalable MLOps platform supporting 100+ data scientists and 500+ models in production. Address infrastructure, governance, and developer experience.", tag: "System Design" },
      { q: "How would you architect a real-time ML feature computation system that handles both streaming and batch data with low latency SLAs?", tag: "Advanced" },
      { q: "Discuss strategies for efficient large language model serving, including quantization, batching, and caching approaches.", tag: "Deep Technical" },
      { q: "How do you approach multi-tenancy and resource isolation in a shared ML platform?", tag: "Advanced" },
      { q: "Describe your approach to cost optimization in cloud-based ML infrastructure without sacrificing reliability.", tag: "Technical" },
      { q: "How would you design a self-healing ML system that automatically detects and responds to model degradation?", tag: "System Design" },
      { q: "Tell me about a technically complex ML infrastructure problem you led a team to solve.", tag: "Leadership" },
    ],
  },

  software_engineer: {
    junior: [
      { q: "Explain the difference between an array and a linked list. When would you choose one over the other?", tag: "Data Structures" },
      { q: "What is Big O notation? How would you analyze the time complexity of a bubble sort algorithm?", tag: "Algorithms" },
      { q: "Describe the four principles of Object-Oriented Programming with real-world examples.", tag: "Conceptual" },
      { q: "What is a RESTful API? Describe the key principles of REST architecture.", tag: "Technical" },
      { q: "Explain the difference between SQL and NoSQL databases. When would you choose each?", tag: "Databases" },
      { q: "What is version control? Describe your typical Git workflow for a team project.", tag: "Practical" },
      { q: "Tell me about a bug you found and fixed. How did you approach debugging it?", tag: "Behavioral" },
    ],
    mid: [
      { q: "Design a URL shortening service like bit.ly. Discuss API design, data modeling, and scalability.", tag: "System Design" },
      { q: "Explain the SOLID principles with code examples. How have they guided your design decisions?", tag: "Technical" },
      { q: "Compare microservices architecture vs. monolithic architecture. What factors influence your choice?", tag: "Architecture" },
      { q: "How would you implement caching in a high-traffic web application? Discuss cache invalidation strategies.", tag: "Technical" },
      { q: "Explain database indexing. How do you decide which columns to index?", tag: "Databases" },
      { q: "Describe your approach to writing and maintaining unit tests. What's your philosophy on test coverage?", tag: "Practical" },
      { q: "Tell me about a time you had to make a significant architectural decision. What was your process?", tag: "Behavioral" },
    ],
    senior: [
      { q: "Design a distributed message queue system that can handle 10M messages/second with at-least-once delivery guarantees.", tag: "System Design" },
      { q: "Explain CAP theorem. How does it influence distributed system design decisions you've made?", tag: "Advanced" },
      { q: "How would you design a rate limiting system for a public API serving millions of clients?", tag: "System Design" },
      { q: "Discuss strategies for database sharding. What challenges arise and how do you address them?", tag: "Advanced" },
      { q: "How do you approach technical debt? Describe a situation where you led an effort to pay it down.", tag: "Leadership" },
      { q: "Design a real-time collaborative document editing system like Google Docs. Address conflicts, consistency, and latency.", tag: "System Design" },
      { q: "How do you mentor junior engineers effectively? What frameworks do you use to guide their growth?", tag: "Leadership" },
    ],
  },
};

// Fill remaining roles with generic professional questions
const GENERIC_QUESTIONS = {
  junior: [
    { q: "Tell me about yourself and what motivated you to pursue this career path.", tag: "Behavioral" },
    { q: "Describe a challenging project you worked on. What was your role and what did you learn?", tag: "Behavioral" },
    { q: "What tools and technologies are you most proficient in? Give examples of how you've used them.", tag: "Technical" },
    { q: "How do you stay updated with the latest trends and technologies in your field?", tag: "Behavioral" },
    { q: "Describe a situation where you had to learn a new technology quickly. How did you approach it?", tag: "Behavioral" },
    { q: "What do you consider your greatest technical strength? Provide a concrete example.", tag: "Self-Assessment" },
    { q: "Where do you see yourself in 3 years and how does this role fit into that vision?", tag: "Career" },
  ],
};

/* ═══════════════════════════════════════════════════════════════
   ② APPLICATION STATE
═══════════════════════════════════════════════════════════════ */

const State = {
  // Setup
  resumeText:       "",
  jobRole:          "",
  difficulty:       "junior",

  // Interview
  questions:        [],
  currentQuestion:  0,
  answers:          [],  // { text, wordCount, keywords, skipped, timeSpent }
  questionTimers:   [],

  // Proctoring
  tabSwitchCount:       0,
  tabSwitchBuffer:      0,   // hysteresis buffer
  cameraStream:         null,
  faceDetectionInterval: null,
  faceNotDetectedCount: 0,
  integrityScore:       100,

  // Voice
  recognition:     null,
  isRecording:     false,
  voiceTranscript: "",

  // Timing
  questionStartTime: null,
  questionElapsed:   0,
  timerInterval:     null,
};

/* ═══════════════════════════════════════════════════════════════
   ③ QUESTION ENGINE — AI-Simulated Adaptive Question Generation
═══════════════════════════════════════════════════════════════ */

const QuestionEngine = {
  /**
   * Parses resume text to extract relevant keywords and experience level signals.
   * Simulates NLP entity extraction.
   */
  parseResume(text) {
    const lower = text.toLowerCase();
    const foundKeywords = [];
    const allKeywords = Object.values(ROLE_KEYWORDS).flat();

    allKeywords.forEach(kw => {
      if (lower.includes(kw.toLowerCase())) foundKeywords.push(kw);
    });

    // Experience level detection from resume
    const yearsMatch = lower.match(/(\d+)\s*(?:\+)?\s*year[s]?\s*(?:of)?\s*experience/);
    const experienceYears = yearsMatch ? parseInt(yearsMatch[1]) : 0;

    const hasAdvancedTerms = ["senior","lead","architect","principal","staff"].some(t => lower.includes(t));
    const hasMidTerms      = ["mid","intermediate","associate"].some(t => lower.includes(t));

    return {
      keywords: [...new Set(foundKeywords)],
      experienceYears,
      inferredLevel: hasAdvancedTerms ? "senior" : hasMidTerms ? "mid" : experienceYears >= 4 ? "senior" : experienceYears >= 2 ? "mid" : "junior",
    };
  },

  /**
   * Generates 7 adaptive questions by combining:
   *  - Role-specific question bank
   *  - Resume-derived context
   *  - Selected difficulty
   */
  generateQuestions(role, difficulty, resumeData) {
    const bank = QUESTION_BANK[role]?.[difficulty] || GENERIC_QUESTIONS[difficulty] || GENERIC_QUESTIONS.junior;

    // Shuffle and take 7
    const shuffled = [...bank].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, CONFIG.totalQuestions);

    // Personalize with resume keywords if available
    if (resumeData.keywords.length > 0) {
      const personalizedQ = this._personalizeQuestion(selected[1], resumeData, role);
      if (personalizedQ) selected[1] = personalizedQ;
    }

    return selected;
  },

  /**
   * Creates a context-aware question based on resume keywords.
   */
  _personalizeQuestion(baseQ, resumeData, role) {
    if (!resumeData.keywords.length) return null;

    const topKeywords = resumeData.keywords.slice(0, 3).join(", ");
    return {
      q: `Your resume mentions experience with ${topKeywords}. Can you walk me through a specific project where you applied these skills and describe the impact it had?`,
      tag: "Experience-Based",
      personalized: true,
    };
  },
};

/* ═══════════════════════════════════════════════════════════════
   ④ ANSWER PROCESSOR — NLP-Simulated Keyword Scoring
═══════════════════════════════════════════════════════════════ */

const AnswerProcessor = {
  /**
   * Multi-dimensional scoring of a single answer:
   *  - length score (quantity signal)
   *  - keyword score (domain knowledge signal)
   *  - structure score (communication signal)
   *  - specificity score (depth signal)
   */
  scoreAnswer(answerText, role, questionTag) {
    if (!answerText || answerText.trim().length < 5) {
      return { total: 0, breakdown: { length: 0, keywords: 0, structure: 0, specificity: 0 }, feedback: "No answer provided." };
    }

    const words = answerText.trim().split(/\s+/).filter(Boolean);
    const wordCount = words.length;
    const lower = answerText.toLowerCase();

    // 1. Length Score (0–25)
    const lengthScore = wordCount < 20  ? 5
                      : wordCount < 50  ? 12
                      : wordCount < 80  ? 18
                      : wordCount < 150 ? 22
                      : 25;

    // 2. Keyword Score (0–35) — domain knowledge
    const roleKws = ROLE_KEYWORDS[role] || [];
    const matchedKws = roleKws.filter(kw => lower.includes(kw.toLowerCase()));
    const kwRatio = roleKws.length ? matchedKws.length / roleKws.length : 0;
    const keywordScore = Math.min(35, Math.round(kwRatio * 200));

    // 3. Structure Score (0–20) — communication quality
    let structureScore = 8;
    if (/\bfirst(ly)?\b|\bsecond(ly)?\b|\bthird(ly)?\b/i.test(answerText)) structureScore += 4;
    if (/\bfor example\b|\bsuch as\b|\binstance\b|\bspecifically\b/i.test(answerText)) structureScore += 4;
    if (/\bconclusion\b|\bsummary\b|\boverall\b|\bin short\b/i.test(answerText)) structureScore += 4;

    // 4. Specificity Score (0–20) — depth indicators
    let specificityScore = 5;
    const numbers = answerText.match(/\d+/g);
    if (numbers && numbers.length >= 2) specificityScore += 5;
    if (/\bproject\b|\bimplemented\b|\bbuilt\b|\bcreated\b|\bdesigned\b|\boptimized\b/i.test(answerText)) specificityScore += 5;
    if (/\bresult\b|\bimpact\b|\bimproved\b|\breduced\b|\bincreased\b|\bachieved\b/i.test(answerText)) specificityScore += 5;

    const total = Math.min(100, lengthScore + keywordScore + structureScore + specificityScore);

    return {
      total,
      wordCount,
      matchedKeywords: matchedKws.slice(0, 5),
      breakdown: { length: lengthScore, keywords: keywordScore, structure: structureScore, specificity: specificityScore },
      feedback: this._generateFeedback(total, wordCount, matchedKws, questionTag),
    };
  },

  _generateFeedback(score, wordCount, keywords, tag) {
    if (score >= 80) return `Excellent response. Strong domain knowledge demonstrated with relevant technical terminology.`;
    if (score >= 60) return `Good answer with solid coverage. Adding more specific examples or metrics would strengthen it further.`;
    if (score >= 40) return `Adequate response but lacks depth. Try to include concrete examples and domain-specific terms.`;
    if (score >= 20) return `Brief answer. Expand on your reasoning and demonstrate technical understanding with examples.`;
    return `Very limited response. This question requires a more detailed and structured answer.`;
  },
};

/* ═══════════════════════════════════════════════════════════════
   ⑤ PROCTORING SYSTEM — Behavioral Monitoring with Hysteresis
═══════════════════════════════════════════════════════════════ */

const ProctoringSystem = {
  /**
   * Initializes the webcam feed and face detection simulation.
   */
  async initCamera() {
    const videoEl  = document.getElementById("cameraFeed");
    const placeholder = document.getElementById("cameraPlaceholder");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      State.cameraStream = stream;
      videoEl.srcObject = stream;
      videoEl.style.display = "block";
      placeholder.style.display = "none";

      this._startFaceSimulation();
      this._logEvent("Camera access granted", "good");
      UIController.updateStat("faceStatus", "Detected ✓", "green-val");
    } catch (err) {
      this._logEvent("Camera permission denied", "warning");
      UIController.updateStat("faceStatus", "No Camera", null);
      document.getElementById("cameraStatusLabel").textContent = "Camera unavailable";
    }
  },

  /**
   * Simulates probabilistic face detection.
   * Real implementation would use face-api.js or similar.
   */
  _startFaceSimulation() {
    const faceBox   = document.getElementById("faceBox");
    const statusLbl = document.getElementById("cameraStatusLabel");

    let detectedConsecutive = 0;

    State.faceDetectionInterval = setInterval(() => {
      // Simulate 85% detection rate
      const detected = Math.random() > 0.15;

      if (detected) {
        detectedConsecutive++;
        State.faceNotDetectedCount = 0;
        faceBox.classList.add("active");
        faceBox.style.borderColor = "";
        statusLbl.textContent = "Face Detected ✓";
        statusLbl.style.color = "var(--green-400)";
        UIController.updateStat("faceStatus", "Detected ✓", "green-val");
      } else {
        detectedConsecutive = 0;
        State.faceNotDetectedCount++;
        faceBox.classList.remove("active");
        statusLbl.textContent = "Face Not Found ✗";
        statusLbl.style.color = "var(--red-400)";
        UIController.updateStat("faceStatus", "Not Detected", null);

        if (State.faceNotDetectedCount >= 3) {
          this._triggerWarning("⚠️ Please ensure your face is clearly visible to the camera.");
          this._deductIntegrity(3);
          State.faceNotDetectedCount = 0;
        }
      }
    }, 2500);
  },

  /**
   * Sets up the Page Visibility API to detect tab switching.
   * Implements hysteresis — only triggers warning after threshold crossings.
   */
  initTabMonitoring() {
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        State.tabSwitchBuffer++;
        this._logEvent(`Tab switch attempt #${State.tabSwitchBuffer}`, "warning");

        // Hysteresis: trigger warning only after threshold
        if (State.tabSwitchBuffer >= CONFIG.tabSwitchThreshold) {
          State.tabSwitchCount++;
          UIController.updateStat("tabSwitchCount", State.tabSwitchCount, "warning-val");

          if (State.tabSwitchCount >= CONFIG.tabSwitchDangerThreshold) {
            this._triggerWarning("🚫 Repeated tab switching detected. Integrity score will be significantly affected.");
            this._logEvent("CRITICAL: Multiple tab switches detected", "danger");
            this._deductIntegrity(12);
          } else {
            this._triggerWarning("⚠️ Tab switching detected! Please remain on this page during the interview.");
            this._logEvent(`Tab switch #${State.tabSwitchCount} recorded`, "danger");
            this._deductIntegrity(8);
          }

          State.tabSwitchBuffer = 0;
        }
      }
    });

    // Also detect window blur as secondary signal
    window.addEventListener("blur", () => {
      State.tabSwitchBuffer = Math.max(0, State.tabSwitchBuffer + 0.5);
    });
  },

  _triggerWarning(message) {
    const box  = document.getElementById("warningBox");
    const text = document.getElementById("warningText");
    box.style.display = "flex";
    text.textContent = message;
    UIController.showToast(message, "warning");

    setTimeout(() => { box.style.display = "none"; }, 6000);
  },

  _deductIntegrity(points) {
    State.integrityScore = Math.max(0, State.integrityScore - points);
    const el = document.getElementById("integrityScore");
    el.textContent = State.integrityScore;

    if (State.integrityScore < 60) {
      el.className = "stat-value";
      el.style.color = "var(--red-500)";
    } else if (State.integrityScore < 80) {
      el.className = "stat-value";
      el.style.color = "var(--amber-500)";
    }
  },

  _logEvent(message, type = "neutral") {
    const log = document.getElementById("proctorLog");
    const li  = document.createElement("li");
    li.className = `log-entry ${type}`;
    const time = new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    li.textContent = `[${time}] ${message}`;
    log.appendChild(li);
    log.scrollTop = log.scrollHeight;
  },

  stopCamera() {
    if (State.cameraStream) {
      State.cameraStream.getTracks().forEach(t => t.stop());
      State.cameraStream = null;
    }
    if (State.faceDetectionInterval) {
      clearInterval(State.faceDetectionInterval);
    }
  },
};

/* ═══════════════════════════════════════════════════════════════
   ⑥ VOICE HANDLER — Web Speech API
═══════════════════════════════════════════════════════════════ */

const VoiceHandler = {
  init() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      document.querySelector('[data-tab="voice"]').disabled = true;
      document.querySelector('[data-tab="voice"]').title = "Speech Recognition not supported in this browser.";
      return;
    }

    State.recognition = new SpeechRecognition();
    State.recognition.continuous = true;
    State.recognition.interimResults = true;
    State.recognition.lang = "en-US";

    State.recognition.onresult = (event) => {
      let interim = "";
      let final   = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          final += event.results[i][0].transcript;
        } else {
          interim += event.results[i][0].transcript;
        }
      }

      State.voiceTranscript += final;
      document.getElementById("voiceTranscript").textContent = State.voiceTranscript + interim;
    };

    State.recognition.onend = () => {
      if (State.isRecording) State.recognition.start();
    };

    State.recognition.onerror = (e) => {
      if (e.error !== "no-speech") {
        UIController.showToast("Microphone error: " + e.error, "error");
        this.stopRecording();
      }
    };
  },

  startRecording() {
    if (!State.recognition) return;

    State.voiceTranscript = "";
    State.isRecording = true;

    const btn   = document.getElementById("voiceBtn");
    const label = document.getElementById("voiceBtnLabel");
    const waves = document.getElementById("voiceWaves");

    btn.classList.add("recording");
    label.textContent = "Recording... Tap to Stop";
    waves.classList.add("active");

    try { State.recognition.start(); }
    catch(e) { /* already started */ }
  },

  stopRecording() {
    State.isRecording = false;

    const btn   = document.getElementById("voiceBtn");
    const label = document.getElementById("voiceBtnLabel");
    const waves = document.getElementById("voiceWaves");

    btn.classList.remove("recording");
    label.textContent = "Tap to Speak";
    waves.classList.remove("active");

    try { State.recognition.stop(); } catch(e) {}
  },

  toggleRecording() {
    if (State.isRecording) this.stopRecording();
    else this.startRecording();
  },

  getTranscript() {
    return State.voiceTranscript || document.getElementById("voiceTranscript").textContent || "";
  },
};

/* ═══════════════════════════════════════════════════════════════
   ⑦ FEEDBACK ENGINE — Comprehensive Report Generation
═══════════════════════════════════════════════════════════════ */

const FeedbackEngine = {
  /**
   * Aggregates all answer scores into a multi-dimensional feedback report.
   */
  generateReport() {
    const answers = State.answers;
    const role    = State.jobRole;

    // Score each answer
    const scored = answers.map((ans, i) => {
      const q    = State.questions[i];
      const text = ans.skipped ? "" : (ans.text || "");
      return {
        ...AnswerProcessor.scoreAnswer(text, role, q?.tag || "General"),
        question:    q?.q || "",
        tag:         q?.tag || "General",
        answerText:  text,
        skipped:     ans.skipped,
        timeSpent:   ans.timeSpent,
      };
    });

    // Aggregate
    const validScores   = scored.filter(s => !s.skipped).map(s => s.total);
    const avgTechnical  = validScores.length ? validScores.reduce((a, b) => a + b, 0) / validScores.length : 0;

    // Communication: based on structure and average word count
    const avgWords  = validScores.length ? answers.reduce((a, ans) => a + (ans.wordCount || 0), 0) / answers.length : 0;
    const commScore = Math.min(100, Math.round(
      (avgWords / CONFIG.answerGoodWords) * 60 +
      (scored.reduce((a, s) => a + (s.breakdown?.structure || 0), 0) / scored.length) * 2
    ));

    // Relevance: keyword density
    const relScore  = Math.min(100, Math.round(avgTechnical * 0.9));

    // Integrity: from proctoring
    const intScore  = State.integrityScore;

    // Overall: weighted average
    const overall   = Math.round(
      avgTechnical * 0.40 +
      commScore    * 0.20 +
      relScore     * 0.20 +
      intScore     * 0.20
    );

    return {
      overall,
      technical:   Math.round(avgTechnical),
      communication: Math.round(commScore),
      relevance:   Math.round(relScore),
      integrity:   intScore,
      scored,
      verdict:     this._getVerdict(overall),
      message:     this._generateMessage(overall, Math.round(commScore), intScore, role),
      strengths:   this._identifyStrengths(scored, avgTechnical, commScore, intScore),
      improvements: this._identifyImprovements(scored, avgTechnical, commScore, intScore),
    };
  },

  _getVerdict(score) {
    if (score >= 80) return { label: "🏆 Excellent Candidate", class: "verdict-excellent" };
    if (score >= 65) return { label: "✅ Strong Candidate", class: "verdict-good" };
    if (score >= 50) return { label: "📊 Average Candidate", class: "verdict-average" };
    return { label: "⚠️ Needs Improvement", class: "verdict-poor" };
  },

  _generateMessage(overall, comm, integrity, role) {
    const roleLabel = role.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());

    if (overall >= 80)
      return `Outstanding performance for the ${roleLabel} role! You demonstrated strong technical depth, clear communication, and excellent behavioral standards. This profile would be highly competitive in a real interview process.`;

    if (overall >= 65)
      return `Good overall performance for the ${roleLabel} role. Your technical answers showed solid fundamentals, though some areas could benefit from more specific examples and deeper elaboration. Continue refining your responses.`;

    if (overall >= 50)
      return `Moderate performance for the ${roleLabel} role. You covered the basics, but interviewers typically look for greater specificity, technical depth, and concrete project experiences. Focus on STAR-format answers.`;

    return `Your responses need significant improvement for the ${roleLabel} role. Focus on strengthening your technical foundations, practicing with real-world examples, and structuring your answers more clearly using the STAR method.`;
  },

  _identifyStrengths(scored, tech, comm, integrity) {
    const strengths = [];
    if (tech >= 70)    strengths.push("Strong domain-specific technical knowledge demonstrated across multiple questions.");
    if (comm >= 65)    strengths.push("Clear and articulate communication with good answer length and structure.");
    if (integrity >= 90) strengths.push("Excellent interview integrity — maintained focus throughout the entire session.");
    const highScored = scored.filter(s => s.total >= 70 && !s.skipped);
    if (highScored.length >= 3) strengths.push(`Performed well in ${highScored.length} out of ${scored.length} questions with strong answers.`);
    const kws = [...new Set(scored.flatMap(s => s.matchedKeywords || []))];
    if (kws.length >= 5) strengths.push(`Used ${kws.length} relevant domain keywords, showing solid technical vocabulary.`);
    if (strengths.length === 0) strengths.push("Completed all questions without skipping — showed commitment and perseverance.");
    return strengths.slice(0, 4);
  },

  _identifyImprovements(scored, tech, comm, integrity) {
    const improvements = [];
    if (tech < 60)     improvements.push("Deepen technical knowledge — review core concepts and practice explaining them clearly.");
    if (comm < 55)     improvements.push("Improve answer structure using the STAR method (Situation, Task, Action, Result).");
    if (integrity < 80) improvements.push("Maintain focus and avoid switching tabs during real interviews — it raises red flags.");
    const skipped = scored.filter(s => s.skipped);
    if (skipped.length > 1) improvements.push(`Avoided ${skipped.length} questions — practice answering even when uncertain to show problem-solving ability.`);
    const lowScored = scored.filter(s => s.total < 40 && !s.skipped);
    if (lowScored.length >= 2) improvements.push("Several answers lacked depth and specific examples — use real project experiences to illustrate points.");
    const avgWords = scored.reduce((a, s) => a + (s.wordCount || 0), 0) / scored.length;
    if (avgWords < 50) improvements.push("Expand your answers — most technical interview responses should be 80–150 words for adequate depth.");
    if (improvements.length === 0) improvements.push("Continue practicing with mock interviews to further sharpen timing and consistency.");
    return improvements.slice(0, 4);
  },
};

/* ═══════════════════════════════════════════════════════════════
   ⑧ UI CONTROLLER — DOM Management & Transitions
═══════════════════════════════════════════════════════════════ */

const UIController = {
  showSection(id) {
    document.querySelectorAll(".section").forEach(s => s.classList.remove("active"));
    document.getElementById(id).classList.add("active");
    window.scrollTo({ top: 0, behavior: "smooth" });
  },

  updateStat(id, value, className) {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = value;
    if (className) {
      el.className = "stat-value " + className;
    }
  },

  renderQuestionDots() {
    const container = document.getElementById("questionDots");
    container.innerHTML = "";
    for (let i = 0; i < CONFIG.totalQuestions; i++) {
      const dot = document.createElement("div");
      dot.className = "q-dot" + (i === State.currentQuestion ? " current" : "");
      dot.id = `dot-${i}`;
      container.appendChild(dot);
    }
  },

  updateDot(index, status) {
    const dot = document.getElementById(`dot-${index}`);
    if (dot) {
      dot.className = "q-dot " + status;
    }
  },

  displayQuestion(index) {
    const q = State.questions[index];
    if (!q) return;

    const total = CONFIG.totalQuestions;

    document.getElementById("questionNumber").textContent  = `Q${index + 1}`;
    document.getElementById("questionText").textContent    = q.q;
    document.getElementById("questionTag").textContent     = q.tag;
    document.getElementById("progressFraction").textContent = `${index + 1} / ${total}`;
    document.getElementById("progressFill").style.width    = `${((index + 1) / total) * 100}%`;
    document.getElementById("nextBtnText").textContent     = index === total - 1 ? "Finish Interview" : "Next Question";

    // Clear answer fields
    document.getElementById("answerText").value = "";
    document.getElementById("voiceTranscript").textContent = "";
    State.voiceTranscript = "";
    document.getElementById("wordCount").textContent = "0 words";

    // Update dots
    this.updateDot(index, "current");

    // Animate question in
    const card = document.getElementById("questionCard");
    card.style.opacity = "0";
    card.style.transform = "translateY(12px)";
    setTimeout(() => {
      card.style.transition = "all 0.4s ease";
      card.style.opacity    = "1";
      card.style.transform  = "translateY(0)";
    }, 50);

    // Reset and start timer
    this.startQuestionTimer();
    State.questionStartTime = Date.now();
  },

  startQuestionTimer() {
    clearInterval(State.timerInterval);
    State.questionElapsed = 0;

    State.timerInterval = setInterval(() => {
      State.questionElapsed++;
      const min = String(Math.floor(State.questionElapsed / 60)).padStart(2, "0");
      const sec = String(State.questionElapsed % 60).padStart(2, "0");
      document.getElementById("questionTimer").textContent = `⏱ ${min}:${sec}`;
    }, 1000);
  },

  stopQuestionTimer() {
    clearInterval(State.timerInterval);
    return State.questionElapsed;
  },

  showToast(message, type = "info") {
    const toast = document.getElementById("toast");
    toast.textContent = message;
    toast.className   = `toast ${type} show`;
    setTimeout(() => { toast.classList.remove("show"); }, 4000);
  },

  renderFeedbackDashboard(report) {
    // Animate overall score ring
    const circumference = 314;
    const offset = circumference - (circumference * report.overall / 100);
    setTimeout(() => {
      document.getElementById("overallRing").style.strokeDashoffset = offset;
    }, 300);

    // Animate score number
    this._animateNumber("overallScoreDisplay", 0, report.overall, 1500);

    // Verdict badge
    const badge = document.getElementById("verdictBadge");
    badge.textContent = report.verdict.label;
    badge.className   = "verdict-badge " + report.verdict.class;

    document.getElementById("overallMessage").textContent = report.message;

    const role = State.jobRole.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
    document.getElementById("candidateMeta").innerHTML =
      `<strong>Role:</strong> ${role} &nbsp;·&nbsp; <strong>Difficulty:</strong> ${State.difficulty.charAt(0).toUpperCase() + State.difficulty.slice(1)} &nbsp;·&nbsp; <strong>Questions:</strong> ${CONFIG.totalQuestions}`;

    // Score bars
    const scores = [
      { id: "Technical",  bar: "barTechnical", val: report.technical,      remark: "remarkTechnical" },
      { id: "Comm",       bar: "barComm",       val: report.communication,  remark: "remarkComm"      },
      { id: "Rel",        bar: "barRel",         val: report.relevance,      remark: "remarkRel"       },
      { id: "Int",        bar: "barInt",         val: report.integrity,      remark: "remarkInt"       },
    ];

    scores.forEach(({ id, bar, val, remark }) => {
      setTimeout(() => {
        document.getElementById("score" + id).textContent = val;
        document.getElementById(bar).style.width = val + "%";
        document.getElementById(remark).textContent = this._scoreRemark(val);
      }, 500);
    });

    // Question reviews
    const reviewList = document.getElementById("reviewList");
    reviewList.innerHTML = "";
    report.scored.forEach((item, i) => {
      const scoreClass = item.total >= 70 ? "score-high" : item.total >= 45 ? "score-medium" : "score-low";
      const ansDisplay = item.skipped ? "<em style='color:var(--text-muted)'>Skipped</em>"
                       : item.answerText
                       ? `"${item.answerText.slice(0, 140)}${item.answerText.length > 140 ? "..." : ""}"`
                       : "<em style='color:var(--text-muted)'>No answer provided</em>";

      reviewList.innerHTML += `
        <div class="review-item">
          <div class="review-q-header">
            <span class="review-q-num">Question ${i + 1} · ${item.tag}</span>
            <span class="review-q-score ${scoreClass}">${item.skipped ? "Skipped" : item.total + "/100"}</span>
          </div>
          <p class="review-question">${item.question}</p>
          <p class="review-answer">${ansDisplay}</p>
          <p class="review-feedback">💡 ${item.feedback || "—"}</p>
        </div>
      `;
    });

    // Strengths & Improvements
    const strengthsList = document.getElementById("strengthsList");
    const improveList   = document.getElementById("improveList");
    strengthsList.innerHTML = report.strengths.map(s => `<li>${s}</li>`).join("");
    improveList.innerHTML   = report.improvements.map(s => `<li>${s}</li>`).join("");
  },

  _animateNumber(id, from, to, duration) {
    const el  = document.getElementById(id);
    const fps = 60;
    const total = Math.round(duration / 1000 * fps);
    let frame = 0;

    const interval = setInterval(() => {
      frame++;
      const progress = frame / total;
      const eased = 1 - Math.pow(1 - progress, 3);
      el.textContent = Math.round(from + (to - from) * eased);
      if (frame >= total) clearInterval(interval);
    }, 1000 / fps);
  },

  _scoreRemark(score) {
    if (score >= 85) return "Exceptional performance";
    if (score >= 70) return "Strong performance";
    if (score >= 55) return "Adequate — room to grow";
    if (score >= 40) return "Needs improvement";
    return "Significantly below benchmark";
  },
};

/* ═══════════════════════════════════════════════════════════════
   ⑨ MAIN CONTROLLER — Application Entry Point
═══════════════════════════════════════════════════════════════ */

const App = {
  init() {
    this._bindSetupEvents();
    this._bindInterviewEvents();
    this._bindFeedbackEvents();
    this._injectSVGDefs();

    // Inject voice button event
    document.getElementById("voiceBtn").addEventListener("click", () => {
      VoiceHandler.toggleRecording();
    });
  },

  _bindSetupEvents() {
    // Character counter
    document.getElementById("resumeInput").addEventListener("input", function() {
      document.getElementById("charCount").textContent = this.value.length;
    });

    // Word counter for answer
    document.getElementById("answerText").addEventListener("input", function() {
      const words = this.value.trim().split(/\s+/).filter(Boolean).length;
      document.getElementById("wordCount").textContent = words + " word" + (words !== 1 ? "s" : "");
    });

    // Difficulty buttons
    document.querySelectorAll(".diff-btn").forEach(btn => {
      btn.addEventListener("click", function() {
        document.querySelectorAll(".diff-btn").forEach(b => b.classList.remove("active"));
        this.classList.add("active");
        State.difficulty = this.dataset.level;
      });
    });

    // Answer tabs
    document.querySelectorAll(".ans-tab").forEach(tab => {
      tab.addEventListener("click", function() {
        document.querySelectorAll(".ans-tab").forEach(t => t.classList.remove("active"));
        document.querySelectorAll(".tab-content").forEach(c => c.classList.remove("active"));
        this.classList.add("active");
        document.getElementById("tab-" + this.dataset.tab).classList.add("active");

        if (this.dataset.tab === "voice") VoiceHandler.init();
      });
    });

    // Start Interview
    document.getElementById("startBtn").addEventListener("click", () => {
      this._startInterview();
    });
  },

  _startInterview() {
    const resumeText = document.getElementById("resumeInput").value.trim();
    const jobRole    = document.getElementById("jobRole").value;

    if (!jobRole) {
      UIController.showToast("Please select a target job role to continue.", "error");
      document.getElementById("jobRole").style.borderColor = "var(--red-400)";
      setTimeout(() => { document.getElementById("jobRole").style.borderColor = ""; }, 2000);
      return;
    }

    if (resumeText.length < 30) {
      UIController.showToast("Please provide a brief resume or profile summary (at least 30 characters).", "warning");
      return;
    }

    // Save state
    State.resumeText = resumeText;
    State.jobRole    = jobRole;
    State.currentQuestion = 0;
    State.answers    = [];
    State.tabSwitchCount  = 0;
    State.tabSwitchBuffer = 0;
    State.integrityScore  = 100;

    // Parse resume
    const resumeData = QuestionEngine.parseResume(resumeText);

    // Generate questions
    State.questions = QuestionEngine.generateQuestions(jobRole, State.difficulty, resumeData);

    // Transition to interview
    UIController.showSection("section-interview");

    // Initialize proctoring
    ProctoringSystem.initCamera();
    ProctoringSystem.initTabMonitoring();

    // Render dots and first question
    UIController.renderQuestionDots();
    UIController.displayQuestion(0);

    UIController.showToast("Interview started! Answer each question thoughtfully.", "success");

    // Update integrity stat
    document.getElementById("integrityScore").textContent = "100";
    document.getElementById("integrityScore").style.color = "";
    document.getElementById("integrityScore").className = "stat-value green-val";
  },

  _bindInterviewEvents() {
    document.getElementById("nextBtn").addEventListener("click", () => {
      this._submitAnswer(false);
    });

    document.getElementById("skipBtn").addEventListener("click", () => {
      this._submitAnswer(true);
    });
  },

  _submitAnswer(skipped = false) {
    const timeSpent = UIController.stopQuestionTimer();
    const idx = State.currentQuestion;

    // Gather answer
    const activeTab  = document.querySelector(".ans-tab.active").dataset.tab;
    let answerText   = "";

    if (!skipped) {
      if (activeTab === "text") {
        answerText = document.getElementById("answerText").value.trim();
      } else {
        answerText = VoiceHandler.getTranscript().trim();
        VoiceHandler.stopRecording();
      }
    }

    const wordCount = answerText.split(/\s+/).filter(Boolean).length;

    // Store answer
    State.answers[idx] = { text: answerText, wordCount, skipped, timeSpent };

    // Update dot
    UIController.updateDot(idx, skipped ? "skipped" : "answered");

    // Move to next or finish
    if (idx < CONFIG.totalQuestions - 1) {
      State.currentQuestion++;
      UIController.displayQuestion(State.currentQuestion);
      UIController.updateDot(State.currentQuestion, "current");
    } else {
      this._finishInterview();
    }
  },

  _finishInterview() {
    // Stop proctoring
    ProctoringSystem.stopCamera();
    UIController.stopQuestionTimer();

    UIController.showToast("Interview complete! Generating your AI report...", "info");

    setTimeout(() => {
      const report = FeedbackEngine.generateReport();
      UIController.showSection("section-feedback");
      UIController.renderFeedbackDashboard(report);
    }, 1200);
  },

  _bindFeedbackEvents() {
    document.getElementById("retakeBtn").addEventListener("click", () => {
      // Reset state
      State.answers         = [];
      State.currentQuestion = 0;
      State.tabSwitchCount  = 0;
      State.tabSwitchBuffer = 0;
      State.integrityScore  = 100;

      document.getElementById("resumeInput").value = "";
      document.getElementById("charCount").textContent = "0";
      document.getElementById("jobRole").value = "";
      document.getElementById("proctorLog").innerHTML = '<li class="log-entry neutral">Session initialized</li>';
      document.getElementById("tabSwitchCount").textContent = "0";
      document.getElementById("integrityScore").textContent = "100";
      document.getElementById("integrityScore").style.color = "";
      document.getElementById("integrityScore").className = "stat-value green-val";
      document.getElementById("warningBox").style.display = "none";
      document.getElementById("cameraFeed").style.display = "none";
      document.getElementById("cameraPlaceholder").style.display = "flex";
      document.getElementById("faceBox").classList.remove("active");
      document.getElementById("faceStatus").textContent = "Checking...";

      UIController.showSection("section-setup");
    });

    document.getElementById("downloadBtn").addEventListener("click", () => {
      this._downloadReport();
    });
  },

  _downloadReport() {
    const report = FeedbackEngine.generateReport();
    const role   = State.jobRole.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
    const date   = new Date().toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" });

    let content = `INTERVIEWIQ — AI PERFORMANCE REPORT\n`;
    content += `${"═".repeat(50)}\n\n`;
    content += `Date: ${date}\n`;
    content += `Role: ${role}\n`;
    content += `Difficulty: ${State.difficulty.charAt(0).toUpperCase() + State.difficulty.slice(1)}\n\n`;
    content += `SCORES\n${"─".repeat(30)}\n`;
    content += `Overall Score:     ${report.overall}/100\n`;
    content += `Technical Skills:  ${report.technical}/100\n`;
    content += `Communication:     ${report.communication}/100\n`;
    content += `Answer Relevance:  ${report.relevance}/100\n`;
    content += `Integrity:         ${report.integrity}/100\n\n`;
    content += `VERDICT: ${report.verdict.label}\n\n`;
    content += `OVERALL FEEDBACK\n${"─".repeat(30)}\n${report.message}\n\n`;
    content += `STRENGTHS\n${"─".repeat(30)}\n`;
    report.strengths.forEach(s => { content += `• ${s}\n`; });
    content += `\nAREAS FOR IMPROVEMENT\n${"─".repeat(30)}\n`;
    report.improvements.forEach(s => { content += `• ${s}\n`; });
    content += `\nQUESTION REVIEW\n${"─".repeat(30)}\n`;
    report.scored.forEach((item, i) => {
      content += `\nQ${i+1} [${item.tag}] — Score: ${item.skipped ? "Skipped" : item.total+"/100"}\n`;
      content += `Question: ${item.question}\n`;
      content += `Answer: ${item.skipped ? "Skipped" : (item.answerText || "Not answered")}\n`;
      content += `Feedback: ${item.feedback}\n`;
    });
    content += `\n${"═".repeat(50)}\nGenerated by InterviewIQ AI Interview System\n`;

    const blob = new Blob([content], { type: "text/plain" });
    const a    = document.createElement("a");
    a.href     = URL.createObjectURL(blob);
    a.download = `InterviewIQ_Report_${date.replace(/\s/g, "_")}.txt`;
    a.click();

    UIController.showToast("Report downloaded successfully!", "success");
  },

  _injectSVGDefs() {
    // Inject gradient defs for score ring into document
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.style.cssText = "position:absolute;width:0;height:0;overflow:hidden;";
    svg.innerHTML = `
      <defs>
        <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#6366F1"/>
          <stop offset="100%" stop-color="#06B6D4"/>
        </linearGradient>
      </defs>
    `;
    document.body.prepend(svg);
  },
};

/* ═══════════════════════════════════════════════════════════════
   BOOT
═══════════════════════════════════════════════════════════════ */
document.addEventListener("DOMContentLoaded", () => App.init());
