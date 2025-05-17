# Semantic Similarity System with AI-Mapped Polarity

## Overview
This system is designed to provide advanced semantic similarity matching with contextual awareness. It uses AI to evaluate terms, categorize them, and assign polarity scores to define relationships between terms. The system is modular and can be integrated into various applications, such as matchmaking, recommendation engines, and sentiment analysis.

## Key Features
1. **Single-Term Processing**:
   - Accepts one term at a time for evaluation.
   - Determines whether the term is a **category** or a **regular term**.

2. **Dynamic Categorization**:
   - If the term is identified as a category, semantic similarity is applied to find related terms.
   - Related terms are mapped to the category for future reuse.

3. **Polarity Mapping**:
   - If the term is identified as a regular term, semantic similarity is applied to find similar terms.
   - Polarity scores are assigned between the term and its similar terms to define their relationships.

4. **Query Filters and Global Configuration**:
   - Supports query filters for polarity and semantic similarity thresholds.
   - Global configurations allow default thresholds for consistent behavior.

5. **Relevance Calculation**:
   - Optionally calculates an overall contextual relevance score based on semantic similarity and polarity.

## Workflow
1. **Input**:
   - A single term is provided as input.
   - Optional query filters can be applied, such as polarity and similarity thresholds.

2. **AI Evaluation**:
   - The system determines whether the term is a **category** or a **regular term**.

3. **Processing**:
   - **If the term is a category**:
     - Semantic similarity is applied to find related terms.
     - These terms are mapped to the category for future reuse.
   - **If the term is a regular term**:
     - Semantic similarity is applied to find similar terms.
     - Polarity mapping is created between the term and the similar terms.

4. **Filtering**:
   - Query filters are applied to the results to exclude terms that do not meet the thresholds.
   - If configured, only the overall contextual relevance score is returned.

5. **Output**:
   - The system returns the filtered results, which may include:
     - Terms with their semantic similarity and polarity scores.
     - Or, if configured, only the overall contextual relevance score.

## Example Use Case
### Input 1: "Political Ideologies" (Category)
1. **AI Evaluation**:
   - The term is identified as a **category**.
2. **Semantic Similarity**:
   - Finds related terms: "republican," "conservative," "libertarian."
3. **Mapping**:
   - Maps these terms to the category "Political Ideologies."
4. **Output**:
   ```json
   {
     "category": "Political Ideologies",
     "terms": ["republican", "conservative", "libertarian"]
   }
   ```

### Input 2: "Republican" (Term)
1. **AI Evaluation**:
   - The term is identified as a **regular term**.
2. **Semantic Similarity**:
   - Finds similar terms: "conservative," "libertarian."
3. **Polarity Mapping**:
   - Assigns polarity scores:
     - "Republican" ↔ "Conservative": 0.9
     - "Republican" ↔ "Libertarian": 0.7
4. **Output**:
   ```json
   {
     "term": "Republican",
     "filteredResults": [
       { "term": "Conservative", "similarity": 0.9, "polarity": 0.9 },
       { "term": "Libertarian", "similarity": 0.7, "polarity": 0.7 }
     ]
   }
   ```

## Configuration
- **Query Filters**:
  - Polarity Threshold: Filters out terms with polarity below a certain value.
  - Semantic Similarity Threshold: Filters out terms with similarity below a certain value.
- **Global Configuration**:
  - Default thresholds for polarity and similarity can be set globally for consistent behavior.

## Future Enhancements
1. **Scalability**:
   - Implement a distributed queue system for handling large datasets.
2. **Performance**:
   - Optimize AI processing for real-time applications.
3. **Feedback Loop**:
   - Allow users to provide feedback on AI categorization and polarity scores to improve accuracy over time.
