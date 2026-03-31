"""
╔══════════════════════════════════════════════════════════════════════╗
║          InterviewIQ — ML Model Demonstration Script                ║
║          model.py | NOT connected to frontend                       ║
║                                                                      ║
║  Purpose: Demonstrate ML understanding for the AI Interview System.  ║
║  Shows how a real backend would train and use an ML model to score  ║
║  interview answers and predict candidate outcomes.                   ║
╚══════════════════════════════════════════════════════════════════════╝

Architecture:
  1. Dataset Generation    — Simulates labeled interview session data
  2. Feature Engineering   — Converts raw inputs to ML-ready features
  3. Model Training        — Trains a DecisionTreeClassifier + Regressor
  4. Evaluation            — Cross-validation, accuracy, feature importance
  5. Prediction Function   — Inference pipeline for new candidates
  6. Report Generation     — Structured output with explanations

Dependencies:
  pip install numpy pandas scikit-learn matplotlib seaborn
"""

import numpy as np
import pandas as pd
from sklearn.tree import DecisionTreeClassifier, DecisionTreeRegressor
from sklearn.linear_model import LogisticRegression, LinearRegression
from sklearn.ensemble import RandomForestClassifier, GradientBoostingRegressor
from sklearn.model_selection import train_test_split, cross_val_score, StratifiedKFold
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.metrics import (
    accuracy_score, classification_report, mean_absolute_error,
    mean_squared_error, r2_score, confusion_matrix
)
from sklearn.pipeline import Pipeline
import warnings
warnings.filterwarnings("ignore")

# ─────────────────────────────────────────────────────────────────────
# 1. CONFIGURATION
# ─────────────────────────────────────────────────────────────────────

RANDOM_SEED = 42
np.random.seed(RANDOM_SEED)

ROLES = [
    "data_scientist", "ml_engineer", "software_engineer",
    "frontend_developer", "backend_developer", "data_analyst",
    "devops_engineer", "product_manager"
]

DIFFICULTIES = ["junior", "mid", "senior"]

VERDICT_MAP = {
    0: "Needs Improvement",
    1: "Average Candidate",
    2: "Strong Candidate",
    3: "Excellent Candidate",
}

# ─────────────────────────────────────────────────────────────────────
# 2. DATASET GENERATION
#    Features engineered from a realistic interview session
# ─────────────────────────────────────────────────────────────────────

def generate_interview_dataset(n_samples: int = 2000) -> pd.DataFrame:
    """
    Generates a synthetic labeled dataset simulating interview sessions.

    Features:
      - avg_answer_length    : Mean word count across all 7 answers
      - keyword_match_ratio  : Fraction of domain keywords present in answers
      - structure_score      : Detected use of structured answer frameworks (STAR)
      - specificity_score    : Presence of numbers, metrics, project references
      - tab_switch_count     : Number of tab switches during interview
      - face_not_detected    : Count of frames where face wasn't visible
      - response_time_avg    : Average seconds spent per question
      - skipped_questions    : Number of questions skipped/left blank
      - role_encoded         : Numerical encoding of the target job role
      - difficulty_encoded   : Numerical encoding of difficulty level (0=jr, 1=mid, 2=sr)

    Target Variables:
      - overall_score        : Continuous score 0–100 (regression target)
      - verdict_class        : Ordinal class 0–3 (classification target)
    """
    print("📊 Generating synthetic interview dataset...")

    role_encoder = LabelEncoder()
    role_encoder.fit(ROLES)

    data = []

    for _ in range(n_samples):
        # Randomly sample candidate profile
        role       = np.random.choice(ROLES)
        difficulty = np.random.choice(DIFFICULTIES, p=[0.45, 0.35, 0.20])
        diff_val   = {"junior": 0, "mid": 1, "senior": 2}[difficulty]

        # Simulate varying candidate quality (bimodal distribution for realism)
        quality = np.random.beta(a=2, b=2)  # Quality draw 0–1

        # ── Feature: Answer Length ──
        # Better candidates write more detailed answers
        base_length = 60 + quality * 100
        avg_answer_length = max(5, np.random.normal(base_length, 25))

        # ── Feature: Keyword Match Ratio ──
        # Correlates strongly with domain knowledge
        keyword_match_ratio = np.clip(quality * 0.6 + np.random.normal(0, 0.08), 0, 1)

        # ── Feature: Structure Score ──
        # Higher-level candidates use STAR framework more
        structure_score = np.clip(
            diff_val * 2 + quality * 15 + np.random.normal(0, 2), 0, 20
        )

        # ── Feature: Specificity Score ──
        # Mentions specific numbers, projects, results
        specificity_score = np.clip(
            quality * 18 + np.random.normal(0, 3), 0, 20
        )

        # ── Proctoring Features ──
        # Tab switches: poor integrity candidates switch more
        integrity_factor = np.random.beta(8, 2)  # Most candidates are honest
        tab_switch_count = int(np.random.poisson(lam=(1 - integrity_factor) * 5))

        # Face detection issues
        face_not_detected = int(np.random.poisson(lam=(1 - integrity_factor) * 3))

        # ── Response Time ──
        # Optimal: 45–90s per question. Too fast = not thinking. Too slow = struggling.
        optimal_time   = 65
        response_time  = np.clip(
            optimal_time + np.random.normal(0, 20) - (quality - 0.5) * 15,
            10, 180
        )

        # ── Skipped Questions ──
        skipped_questions = max(0, int(np.random.poisson(lam=(1 - quality) * 2)))
        skipped_questions = min(skipped_questions, 7)

        # ─── COMPUTE TARGET: OVERALL SCORE ───
        # Weighted formula mirroring the JavaScript FeedbackEngine
        technical_component    = (keyword_match_ratio * 35 + structure_score + specificity_score) * quality
        communication_component = min(20, (avg_answer_length / 120) * 20)
        integrity_component    = max(0, 100 - tab_switch_count * 10 - face_not_detected * 5)
        skip_penalty           = skipped_questions * 8

        raw_score = (
            technical_component    * 0.40 +
            communication_component * 0.20 +
            min(35, keyword_match_ratio * 35) * 0.20 +
            integrity_component    * 0.20
        ) - skip_penalty + np.random.normal(0, 5)

        overall_score = float(np.clip(raw_score, 0, 100))

        # ─── COMPUTE TARGET: VERDICT CLASS ───
        if overall_score >= 78:
            verdict_class = 3   # Excellent
        elif overall_score >= 62:
            verdict_class = 2   # Strong
        elif overall_score >= 45:
            verdict_class = 1   # Average
        else:
            verdict_class = 0   # Needs Improvement

        data.append({
            # Input features
            "avg_answer_length":    round(avg_answer_length, 1),
            "keyword_match_ratio":  round(keyword_match_ratio, 4),
            "structure_score":      round(structure_score, 2),
            "specificity_score":    round(specificity_score, 2),
            "tab_switch_count":     tab_switch_count,
            "face_not_detected":    face_not_detected,
            "response_time_avg":    round(response_time, 1),
            "skipped_questions":    skipped_questions,
            "role_encoded":         role_encoder.transform([role])[0],
            "difficulty_encoded":   diff_val,
            # Target variables
            "overall_score":        round(overall_score, 2),
            "verdict_class":        verdict_class,
            # Metadata (not used in training)
            "_role":                role,
            "_difficulty":          difficulty,
        })

    df = pd.DataFrame(data)
    print(f"✅ Dataset generated: {len(df)} samples, {df.shape[1]} columns\n")
    return df


# ─────────────────────────────────────────────────────────────────────
# 3. FEATURE ENGINEERING & PREPROCESSING
# ─────────────────────────────────────────────────────────────────────

FEATURE_COLS = [
    "avg_answer_length",
    "keyword_match_ratio",
    "structure_score",
    "specificity_score",
    "tab_switch_count",
    "face_not_detected",
    "response_time_avg",
    "skipped_questions",
    "role_encoded",
    "difficulty_encoded",
]

def preprocess_features(df: pd.DataFrame) -> tuple:
    """
    Prepares feature matrix and target vectors.

    Feature Descriptions:
      avg_answer_length   — Proxy for communication effort and depth
      keyword_match_ratio — Domain knowledge signal (NLP keyword density)
      structure_score     — Structured thinking (STAR method detection)
      specificity_score   — Result-orientation (numbers, project mentions)
      tab_switch_count    — Behavioral integrity metric (proctoring)
      face_not_detected   — Attention/presence metric (proctoring)
      response_time_avg   — Cognitive processing time per question
      skipped_questions   — Confidence/preparation indicator
      role_encoded        — Job role category (label encoded)
      difficulty_encoded  — Interview difficulty level (ordinal 0/1/2)

    Returns:
      X       — Feature matrix (n_samples × n_features)
      y_score — Overall score regression target
      y_class — Verdict classification target (0–3)
    """
    X       = df[FEATURE_COLS].values
    y_score = df["overall_score"].values
    y_class = df["verdict_class"].values
    return X, y_score, y_class


def engineer_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Adds derived features that may improve model performance.
    """
    df = df.copy()

    # Composite integrity index
    df["integrity_index"] = np.clip(
        100 - df["tab_switch_count"] * 10 - df["face_not_detected"] * 5, 0, 100
    )

    # Answer quality composite
    df["answer_quality"] = (
        df["keyword_match_ratio"] * 0.4 +
        (df["avg_answer_length"] / 200) * 0.3 +
        (df["structure_score"] / 20) * 0.15 +
        (df["specificity_score"] / 20) * 0.15
    )

    # Preparation score (penalizes skips and low response time)
    df["preparation_score"] = np.clip(
        100 - df["skipped_questions"] * 12 - np.where(df["response_time_avg"] < 20, 15, 0),
        0, 100
    )

    return df


# ─────────────────────────────────────────────────────────────────────
# 4. MODEL TRAINING
# ─────────────────────────────────────────────────────────────────────

class InterviewScorePredictor:
    """
    Dual-model system:
      - Regressor   : Predicts continuous overall score (0–100)
      - Classifier  : Predicts verdict category (Excellent/Strong/Average/Poor)

    Models Used:
      Primary:  DecisionTreeClassifier / GradientBoostingRegressor
      Baseline: LogisticRegression / LinearRegression
    """

    def __init__(self):
        self.scaler     = StandardScaler()
        self.regressor  = GradientBoostingRegressor(
            n_estimators=120,
            max_depth=5,
            learning_rate=0.08,
            subsample=0.85,
            random_state=RANDOM_SEED
        )
        self.classifier = RandomForestClassifier(
            n_estimators=100,
            max_depth=8,
            min_samples_split=10,
            class_weight="balanced",
            random_state=RANDOM_SEED
        )
        self.baseline_reg   = LinearRegression()
        self.baseline_clf   = LogisticRegression(max_iter=500, random_state=RANDOM_SEED)
        self.is_trained     = False
        self.feature_names  = FEATURE_COLS
        self.label_encoder  = LabelEncoder()

    def train(self, X: np.ndarray, y_score: np.ndarray, y_class: np.ndarray):
        """
        Trains all models on the provided feature matrix and targets.

        Process:
          1. Scale features (important for LogisticRegression / LinearRegression)
          2. Train-test split (80/20, stratified on verdict class)
          3. Fit Gradient Boosting Regressor and Random Forest Classifier
          4. Fit baseline models for comparison
          5. Evaluate on hold-out test set
          6. Run 5-fold cross-validation on full dataset
        """
        print("🔧 Training ML models...\n")

        # Split dataset
        (X_train, X_test,
         y_score_train, y_score_test,
         y_class_train, y_class_test) = train_test_split(
            X, y_score, y_class,
            test_size=0.20,
            random_state=RANDOM_SEED,
            stratify=y_class
        )

        # Scale features
        X_train_sc = self.scaler.fit_transform(X_train)
        X_test_sc  = self.scaler.transform(X_test)

        # ── Train Primary Models ──
        self.regressor.fit(X_train, y_score_train)    # Tree-based: no scaling needed
        self.classifier.fit(X_train, y_class_train)   # Tree-based: no scaling needed

        # ── Train Baseline Models ──
        self.baseline_reg.fit(X_train_sc, y_score_train)
        self.baseline_clf.fit(X_train_sc, y_class_train)

        self.is_trained = True

        # ── Evaluate ──
        self._evaluate(
            X_test, X_test_sc,
            y_score_test, y_class_test
        )

        # ── Cross-validation ──
        self._cross_validate(X, y_score, y_class)

        # ── Feature Importance ──
        self._print_feature_importance()

        return self

    def _evaluate(self, X_test, X_test_sc, y_score_test, y_class_test):
        """Prints evaluation metrics on the test set."""

        print("=" * 60)
        print("📈 MODEL EVALUATION (Test Set — 20% Hold-out)")
        print("=" * 60)

        # Regression
        y_pred_score_gb  = self.regressor.predict(X_test)
        y_pred_score_lr  = self.baseline_reg.predict(X_test_sc)

        mae_gb  = mean_absolute_error(y_score_test, y_pred_score_gb)
        mae_lr  = mean_absolute_error(y_score_test, y_pred_score_lr)
        r2_gb   = r2_score(y_score_test, y_pred_score_gb)
        r2_lr   = r2_score(y_score_test, y_pred_score_lr)

        print(f"\n📊 Score Regression (Predicting 0–100 score):")
        print(f"  Gradient Boosting — MAE: {mae_gb:.2f} pts | R²: {r2_gb:.4f}")
        print(f"  Linear Regression  — MAE: {mae_lr:.2f} pts | R²: {r2_lr:.4f}")

        # Classification
        y_pred_class_rf  = self.classifier.predict(X_test)
        y_pred_class_lr  = self.baseline_clf.predict(X_test_sc)

        acc_rf = accuracy_score(y_class_test, y_pred_class_rf)
        acc_lr = accuracy_score(y_class_test, y_pred_class_lr)

        print(f"\n🏷️  Verdict Classification (0=Poor → 3=Excellent):")
        print(f"  Random Forest      — Accuracy: {acc_rf*100:.2f}%")
        print(f"  Logistic Regression— Accuracy: {acc_lr*100:.2f}%")

        print(f"\n📋 Random Forest Classification Report:")
        print(classification_report(
            y_class_test, y_pred_class_rf,
            target_names=list(VERDICT_MAP.values()),
            digits=3
        ))

    def _cross_validate(self, X, y_score, y_class):
        """5-fold stratified cross-validation."""

        print("=" * 60)
        print("🔁 CROSS-VALIDATION (5-Fold Stratified)")
        print("=" * 60)

        # Regressor CV (scoring: negative MAE)
        cv_scores_reg = cross_val_score(
            self.regressor, X, y_score,
            cv=5, scoring="neg_mean_absolute_error"
        )
        mean_mae = -cv_scores_reg.mean()
        std_mae  = cv_scores_reg.std()

        # Classifier CV
        skf = StratifiedKFold(n_splits=5, shuffle=True, random_state=RANDOM_SEED)
        cv_scores_clf = cross_val_score(
            self.classifier, X, y_class, cv=skf, scoring="accuracy"
        )

        print(f"\n  Regression  — CV MAE:  {mean_mae:.2f} ± {std_mae:.2f} pts")
        print(f"  Classification — CV Accuracy: {cv_scores_clf.mean()*100:.2f}% ± {cv_scores_clf.std()*100:.2f}%\n")

    def _print_feature_importance(self):
        """Displays Gradient Boosting feature importances."""

        print("=" * 60)
        print("🎯 FEATURE IMPORTANCE (Gradient Boosting Regressor)")
        print("=" * 60)

        importances = self.regressor.feature_importances_
        feat_imp = sorted(
            zip(self.feature_names, importances),
            key=lambda x: x[1], reverse=True
        )

        print()
        for feat, imp in feat_imp:
            bar = "█" * int(imp * 60)
            print(f"  {feat:<25} {bar} {imp:.4f}")
        print()

    def predict(self, features: dict) -> dict:
        """
        Inference pipeline for a new candidate.

        Args:
            features: dict with keys matching FEATURE_COLS

        Returns:
            dict with predicted score, verdict, confidence, and explanation.

        Example Input:
            {
                "avg_answer_length":   95.0,
                "keyword_match_ratio": 0.42,
                "structure_score":     14.0,
                "specificity_score":   12.0,
                "tab_switch_count":    1,
                "face_not_detected":   0,
                "response_time_avg":   58.0,
                "skipped_questions":   0,
                "role_encoded":        0,     # data_scientist
                "difficulty_encoded":  1,     # mid-level
            }
        """
        if not self.is_trained:
            raise RuntimeError("Model must be trained before prediction. Call .train() first.")

        # Build feature vector (preserve order)
        X_input = np.array([[features[col] for col in FEATURE_COLS]])

        # Predict score
        predicted_score = float(np.clip(self.regressor.predict(X_input)[0], 0, 100))

        # Predict verdict class + probability
        pred_class   = int(self.classifier.predict(X_input)[0])
        pred_proba   = self.classifier.predict_proba(X_input)[0]
        confidence   = float(pred_proba[pred_class])

        # Interpret integrity
        tab_switches    = features.get("tab_switch_count", 0)
        integrity_score = max(0, 100 - tab_switches * 10 - features.get("face_not_detected", 0) * 5)

        # Generate human-readable explanation
        explanation = _explain_prediction(features, predicted_score, pred_class)

        return {
            "predicted_score":    round(predicted_score, 1),
            "verdict_class":      pred_class,
            "verdict_label":      VERDICT_MAP[pred_class],
            "confidence":         round(confidence * 100, 1),
            "integrity_score":    integrity_score,
            "class_probabilities": {
                VERDICT_MAP[i]: round(p * 100, 1)
                for i, p in enumerate(pred_proba)
            },
            "explanation":        explanation,
        }


def _explain_prediction(features: dict, score: float, verdict_class: int) -> str:
    """
    Generates a natural language explanation of the prediction.
    Simulates XAI (Explainable AI) — similar to SHAP/LIME summaries.
    """
    reasons = []

    # Answer quality
    if features["keyword_match_ratio"] > 0.35:
        reasons.append("strong domain keyword usage indicating solid technical knowledge")
    elif features["keyword_match_ratio"] < 0.15:
        reasons.append("limited domain-specific terminology in answers")

    # Communication
    if features["avg_answer_length"] > 80:
        reasons.append("detailed and well-elaborated responses")
    elif features["avg_answer_length"] < 30:
        reasons.append("very brief answers lacking sufficient depth")

    # Structure
    if features["structure_score"] > 12:
        reasons.append("structured answer format (STAR method detected)")

    # Integrity
    if features["tab_switch_count"] > 3:
        reasons.append("multiple tab switches raising integrity concerns")
    elif features["tab_switch_count"] == 0:
        reasons.append("excellent interview integrity maintained throughout")

    # Skips
    if features["skipped_questions"] > 2:
        reasons.append(f"{features['skipped_questions']} questions skipped suggesting preparation gaps")

    verdict = VERDICT_MAP[verdict_class]
    reason_str = "; ".join(reasons) if reasons else "balanced overall performance"

    return f"Verdict '{verdict}' (score: {score:.1f}/100) based on: {reason_str}."


# ─────────────────────────────────────────────────────────────────────
# 5. DEMONSTRATION PIPELINE
# ─────────────────────────────────────────────────────────────────────

def run_demo_predictions(model: InterviewScorePredictor):
    """
    Runs sample predictions on three different candidate profiles.
    Demonstrates the full inference pipeline.
    """
    print("\n" + "=" * 60)
    print("🎤 DEMO PREDICTIONS — Sample Candidates")
    print("=" * 60)

    candidates = [
        {
            "name": "Alice (Strong Senior Data Scientist)",
            "features": {
                "avg_answer_length":   125.0,
                "keyword_match_ratio": 0.52,
                "structure_score":     16.5,
                "specificity_score":   15.0,
                "tab_switch_count":    0,
                "face_not_detected":   1,
                "response_time_avg":   62.0,
                "skipped_questions":   0,
                "role_encoded":        0,
                "difficulty_encoded":  2,
            }
        },
        {
            "name": "Bob (Average Junior Software Engineer)",
            "features": {
                "avg_answer_length":   55.0,
                "keyword_match_ratio": 0.22,
                "structure_score":     8.0,
                "specificity_score":   7.0,
                "tab_switch_count":    2,
                "face_not_detected":   2,
                "response_time_avg":   45.0,
                "skipped_questions":   2,
                "role_encoded":        2,
                "difficulty_encoded":  0,
            }
        },
        {
            "name": "Carol (Poor Integrity — Multiple Tab Switches)",
            "features": {
                "avg_answer_length":   40.0,
                "keyword_match_ratio": 0.10,
                "structure_score":     4.0,
                "specificity_score":   3.0,
                "tab_switch_count":    6,
                "face_not_detected":   5,
                "response_time_avg":   25.0,
                "skipped_questions":   3,
                "role_encoded":        1,
                "difficulty_encoded":  1,
            }
        },
    ]

    for candidate in candidates:
        print(f"\n{'─' * 50}")
        print(f"👤 Candidate: {candidate['name']}")
        print(f"{'─' * 50}")

        result = model.predict(candidate["features"])

        print(f"  📊 Predicted Score : {result['predicted_score']}/100")
        print(f"  🏷️  Verdict         : {result['verdict_label']}")
        print(f"  🎯 Confidence       : {result['confidence']}%")
        print(f"  🔒 Integrity Score  : {result['integrity_score']}/100")
        print(f"\n  📋 Class Probabilities:")
        for label, prob in result["class_probabilities"].items():
            bar = "▓" * int(prob / 5)
            print(f"     {label:<22} {bar} {prob}%")
        print(f"\n  💡 Explanation: {result['explanation']}")


# ─────────────────────────────────────────────────────────────────────
# 6. ENTRY POINT
# ─────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    print("\n" + "╔" + "═" * 58 + "╗")
    print("║       InterviewIQ ML Engine — Demonstration Run         ║")
    print("╚" + "═" * 58 + "╝\n")

    # Step 1: Generate dataset
    df = generate_interview_dataset(n_samples=2000)

    # Step 2: Feature engineering
    df = engineer_features(df)

    # Step 3: Preprocess
    X, y_score, y_class = preprocess_features(df)

    print(f"Dataset Summary:")
    print(f"  Samples:  {len(df)}")
    print(f"  Features: {len(FEATURE_COLS)}")
    print(f"  Score range: {y_score.min():.1f} – {y_score.max():.1f}")
    print(f"  Class distribution: { {VERDICT_MAP[i]: int((y_class == i).sum()) for i in range(4)} }\n")

    # Step 4: Train model
    model = InterviewScorePredictor()
    model.train(X, y_score, y_class)

    # Step 5: Run demo predictions
    run_demo_predictions(model)

    print("\n" + "=" * 60)
    print("✅ InterviewIQ ML Demonstration Complete")
    print("   NOTE: This script is for ML demonstration only.")
    print("   The frontend uses JavaScript-based AI simulation.")
    print("=" * 60 + "\n")
