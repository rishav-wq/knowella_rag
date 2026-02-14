# Knowella Bot - Test Question Set
# 30 Questions to validate RAG performance, grounding, and citation accuracy

## Category 1: Company Services & Solutions (10 questions)

1. What services does Knowella offer?
2. What design services does Knowella offer?
3. How does Knowella help with supply chain management?
4. What software and technologies does Knowella use?
5. Does Knowella work with Figma or WordPress?
6. What is Knowella's approach to UI/UX design?
7. Tell me about Knowella's mobile UI design services
8. What branding services does Knowella provide?
9. How does Knowella support digital transformation?
10. What development services does Knowella offer?

## Category 2: Features & Capabilities (10 questions)

11. What metrics or statistics does Knowella report for organizations?
12. How does Knowella's Health & Safety Management feature work?
13. What is real-time incident tracking in Knowella?
14. Tell me about Knowella's Quality Assurance features
15. What automation capabilities does Knowella provide?
16. How does Knowella help with data entry and analysis?
17. What are the benefits of Knowella's centralized platforms?
18. How does Knowella improve workplace culture?
19. What employee engagement tools does Knowella offer?
20. Tell me about Knowella's no-code automation

## Category 3: Industry & Use Cases (5 questions)

21. What industries does Knowella serve?
22. How can Knowella help with manufacturing operations?
23. What solutions does Knowella provide for inventory management?
24. How does Knowella support logistics operations?
25. Tell me about Knowella's workplace management solutions

## Category 4: Specific Products/Portfolio (5 questions)

26. What is the Smart Watch UI/UX Design project?
27. Tell me about Knowella's hoodie design portfolio
28. What cosmetic bottle design work has Knowella done?
29. Show me examples of Knowella's design work
30. What portfolio projects does Knowella showcase?

---

## Expected Behavior for All Questions:

✅ **Must Include:**
- Grounded answer from Knowella content only
- At least 1 citation with URL
- Relevant and accurate information
- Professional tone

❌ **Must NOT:**
- Hallucinate information not in the content
- Provide generic answers without citations
- Reference competitors or non-Knowella content
- Make up statistics or features

---

## Testing Instructions:

1. **Run each question through the chat widget**
2. **Verify for each response:**
   - [ ] Answer is relevant to the question
   - [ ] At least 1 citation is provided
   - [ ] Citations link to knowella.com URLs
   - [ ] No hallucinated information
   - [ ] Response length is reasonable (not too short/long)
   - [ ] Professional tone maintained

3. **Record results:**
   - Total questions: 30
   - Successful responses: ___
   - Failed responses: ___
   - Response time (avg): ___ seconds
   - Citations per response (avg): ___

4. **Common failure patterns to watch for:**
   - "I don't have enough information" (threshold too high?)
   - Very generic answers (retrieval not working?)
   - No citations (citation extraction failing?)
   - Slow responses >90 seconds (LLM performance issue?)

---

## Quick Test Command (for automated testing):

```javascript
// Sample Node.js test script
const questions = [
  "What services does Knowella offer?",
  "What design services does Knowella offer?",
  // ... add all 30 questions
];

async function testBot() {
  for (const question of questions) {
    const response = await fetch('http://localhost:3000/chat/knowella', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question })
    });
    
    const data = await response.json();
    
    console.log(`\n❓ ${question}`);
    console.log(`✅ ${data.answer}`);
    console.log(`📚 Citations: ${data.citations?.length || 0}`);
    console.log(`⏱️  Time: ${data.metadata?.elapsed_ms}ms`);
  }
}
```
