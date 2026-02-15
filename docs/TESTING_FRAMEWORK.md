# RAG System Testing Framework

After ingestion completes, use this to test accuracy improvements.

---

## 📊 Test Categories

### 1. **General Concept Questions** (Should work well with semantic search)
These test if the system understands concepts and can find related content.

✅ **Expected:** High accuracy with semantic-only

| # | Question | Expected Answer Contains | Pass Criteria |
|---|----------|------------------------|---------------|
| 1 | What is Knowella? | Platform, operations, supply chain, safety | ✅ Accurate overview |
| 2 | How does AI help workplace safety? | AI cameras, alerts, detection, compliance | ✅ Mentions AI safety features |
| 3 | What are benefits of digital forms? | Reduced costs, faster, accuracy, efficiency | ✅ Lists 3+ benefits |
| 4 | How to improve employee engagement? | Recognition, culture, communication, feedback | ✅ Actionable suggestions |

---

### 2. **Specific Features/Products** (Semantic should handle these)

| # | Question | Expected Answer Contains | Pass Criteria |
|---|----------|------------------------|---------------|
| 5 | What is AI ergonomics? | Posture analysis, video, RULA, REBA, risk scoring | ✅ Explains the feature |
| 6 | What does App Builder do? | No-code, custom apps, workflows, forms | ✅ Feature description |
| 7 | How does QR code tracking work? | Scan, asset tracking, equipment, location | ✅ Usage explanation |
| 8 | What is supply chain visibility? | Real-time, tracking, monitoring, logistics | ✅ Concept explained |

---

### 3. **Statistics & Numbers** (CRITICAL - might need hybrid if fails)

⚠️ **Watch closely:** If these fail, consider adding BM25

| # | Question | Expected Answer | Pass Criteria |
|---|----------|----------------|---------------|
| 9 | What results do organizations see with Knowella? | 1.8x engagement, 70% less data-entry, 45% more insights, 62% drop in accidents | ✅ Contains 2+ specific stats |
| 10 | What percentage improvements are mentioned? | Specific percentages from blog content | ✅ Exact numbers retrieved |
| 11 | How much faster is data entry? | 70% reduction | ✅ Exact stat |

---

### 4. **Acronyms & Technical Terms** (Might need hybrid if fails)

⚠️ **Watch closely:** If semantic misses these, add BM25

| # | Question | Expected Answer Contains | Pass Criteria |
|---|----------|------------------------|---------------|
| 12 | What is OSHA management? | OSHA, compliance, safety regulations | ✅ Mentions OSHA directly |
| 13 | ISO certification management | ISO, standards, audit, quality | ✅ ISO-specific content |
| 14 | What is RULA assessment? | RULA, upper-limb, ergonomic, posture | ✅ Explains RULA |
| 15 | What is BM25? | (Trick question - should say no info) | ✅ Says "I don't have that info" |

---

### 5. **Comparison Questions** (Tests retrieval quality)

| # | Question | Expected Answer | Pass Criteria |
|---|----------|----------------|---------------|
| 16 | Difference between RULA and REBA? | RULA = upper limb, REBA = whole body | ✅ Clear comparison |
| 17 | Digital forms vs paper forms? | Benefits of digital listed | ✅ Comparison provided |
| 18 | Knowella vs traditional tools? | AI-powered, no-code, real-time | ✅ Differentiators listed |

---

### 6. **Multi-hop Questions** (Tests reasoning)

| # | Question | Expected Answer | Pass Criteria |
|---|----------|----------------|---------------|
| 19 | How can AI improve supply chain safety? | Combines AI + supply chain + safety concepts | ✅ Synthesizes multiple topics |
| 20 | What's the ROI of workplace digitization? | Cost reduction, efficiency gains, specific metrics | ✅ Multi-aspect answer |

---

## 📈 Scoring System

### **Pass Rate by Category:**

| Category | Pass Rate | Status | Action |
|----------|-----------|--------|--------|
| General Concepts (1-4) | 4/4 (100%) | ✅ Excellent | Keep semantic-only |
| Specific Features (5-8) | 4/4 (100%) | ✅ Excellent | Keep semantic-only |
| **Statistics (9-11)** | **2/3 (67%)** | ⚠️ Fair | Consider hybrid |
| **Acronyms (12-15)** | **2/4 (50%)** | ❌ Poor | Add BM25 hybrid |
| Comparisons (16-18) | 3/3 (100%) | ✅ Excellent | Keep semantic-only |
| Multi-hop (19-20) | 2/2 (100%) | ✅ Excellent | Keep semantic-only |

### **Decision Matrix:**

| Overall Accuracy | Decision |
|-----------------|----------|
| **90%+ pass rate** | ✅ **Semantic-only is sufficient** |
| **75-89% pass rate** | ⚠️ Test with hybrid, compare results |
| **<75% pass rate** | ❌ Definitely add hybrid search |

### **If Statistics/Acronyms fail:**
- 📊 Statistics failing? → BM25 helps with exact numbers
- 🔤 Acronyms failing? → BM25 helps with exact term matching

---

## 🧪 How to Test

### **Method 1: Manual Testing (Quick)**

```bash
# Test via your chat interface or:
curl -X POST http://localhost:3000/chat/knowella \
  -H "Content-Type: application/json" \
  -d '{"question": "What is Knowella?", "sessionId": "test-001"}'
```

### **Method 2: Automated Testing (Better)**

Create `test-queries.json`:
```json
[
  {"id": 1, "question": "What is Knowella?", "category": "general"},
  {"id": 2, "question": "How does AI help workplace safety?", "category": "general"},
  ...
]
```

Run batch test:
```bash
for question in $(cat test-queries.json | jq -r '.[] | .question'); do
  echo "Testing: $question"
  curl -X POST http://localhost:3000/chat/knowella \
    -H "Content-Type: application/json" \
    -d "{\"question\": \"$question\"}"
  echo "---"
done
```

---

## 📊 Results Template

Copy this and fill in your results:

```
## Test Results (Date: ______)

### General Concepts (1-4)
- [✅/❌] Q1: What is Knowella?
- [✅/❌] Q2: How does AI help workplace safety?
- [✅/❌] Q3: What are benefits of digital forms?
- [✅/❌] Q4: How to improve employee engagement?
**Score: __/4 (___%)**

### Specific Features (5-8)
- [✅/❌] Q5: What is AI ergonomics?
- [✅/❌] Q6: What does App Builder do?
- [✅/❌] Q7: How does QR code tracking work?
- [✅/❌] Q8: What is supply chain visibility?
**Score: __/4 (___%)**

### Statistics & Numbers (9-11) ⚠️ CRITICAL
- [✅/❌] Q9: What results do organizations see?
- [✅/❌] Q10: What percentage improvements?
- [✅/❌] Q11: How much faster is data entry?
**Score: __/3 (___%)**

### Acronyms (12-15) ⚠️ CRITICAL
- [✅/❌] Q12: What is OSHA management?
- [✅/❌] Q13: ISO certification management?
- [✅/❌] Q14: What is RULA assessment?
- [✅/❌] Q15: What is BM25? (should fail correctly)
**Score: __/4 (___%)**

### Comparisons (16-18)
- [✅/❌] Q16: Difference between RULA and REBA?
- [✅/❌] Q17: Digital forms vs paper?
- [✅/❌] Q18: Knowella vs traditional tools?
**Score: __/3 (___%)**

### Multi-hop (19-20)
- [✅/❌] Q19: How can AI improve supply chain safety?
- [✅/❌] Q20: What's the ROI of digitization?
**Score: __/2 (___%)**

---

**Overall Score: __/20 (___%)**

**Decision:**
- [ ] ✅ Semantic-only is sufficient (90%+)
- [ ] ⚠️ Test hybrid search (75-89%)
- [ ] ❌ Definitely need hybrid (<75%)

**Notes:**
- What failed? _________________
- Why did it fail? _________________
- Would BM25 help? _________________
```

---

## 🚀 Next Steps

1. ✅ **Wait for ingestion to complete** (~162 pages)
2. ✅ **Run these 20 test questions**
3. ✅ **Calculate pass rate**
4. ✅ **Decide: Keep semantic-only OR add hybrid**

---

## 💡 Pro Tips

### **What Makes a Good Answer:**
- ✅ Directly answers the question
- ✅ Uses information from the context
- ✅ Cites sources
- ✅ No hallucinations
- ✅ Concise and accurate

### **What's a Failed Answer:**
- ❌ "I don't have that information" (when you know it's in the DB)
- ❌ Generic answer (not specific to Knowella)
- ❌ Hallucinated facts
- ❌ Completely irrelevant

### **Edge Cases to Watch:**
- Questions with multiple sub-questions
- Questions requiring synthesis across chunks
- Questions about specific numbers/stats
- Questions with exact terms (OSHA, ISO, etc.)

---

## 📈 Expected Results

### **With New 500-Token Chunks:**
- General concepts: 95%+ (up from 85%)
- Features: 90%+ (up from 75%)
- Statistics: 80%+ (up from 60%) ⚠️ Watch this
- Acronyms: 75%+ (up from 60%) ⚠️ Watch this
- Overall: 85-90% (up from 70-75%)

### **If You Add Hybrid:**
- Statistics: 95%+ (from 80%)
- Acronyms: 90%+ (from 75%)
- Overall: 92-95%

---

**Good luck with testing!** 🚀

Once ingestion completes, run these tests and share your results!
