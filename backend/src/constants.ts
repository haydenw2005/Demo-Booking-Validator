export const ACTION_SUBTASK_PROMPT = `Consider:
    1. Don't repeat previous actions unless necessary. Check to see if action history already has this action, and was successful. If not, make a change.
    2. Choose the most appropriate next subtask that progresses toward completing the current goal.
    3. IMPORTANT: For the selector, use the numerical index (e.g. "0", "1", "2") or the data-ai-index value (e.g. "ai-0", "ai-1").
       These are the most reliable ways to identify elements.
    4. Consider only the current page when planning the action.
    5. Indicate if you believe the goal is now complete based on the action history and current state.
    6. IMPORTANT: You can decide to advance to the next goal if you determine that the current goal is semantically complete
       based on the actions taken so far. This is different from isGoalComplete - it's about your assessment of the situation.
    7. IMPORTANT: Only use selectors that are actually present in the current page. Do not hallucinate selectors.
    
    Return both a specific subtask and an action that will help complete this task. The action should be precise and executable.
    Include a "purpose" field that explains why this action is being taken and how it contributes to the overall goal.
    
    For the 'value' field, only include it if the action is 'fill' or 'select' - leave it undefined otherwise.
    
    Set 'advanceToNextGoal' to true if you believe that enough actions have been taken to satisfy the current goal and we
    should move on to the next goal. Provide an 'advanceReason' explaining why you believe we should advance.
`;
