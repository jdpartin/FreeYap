# Tagging System Documentation

## Overview
The tagging system is designed to create a personalized and inclusive experience for all users. It allows users to connect with others who share their interests or preferences while ensuring that different types of experiences are separated to prevent unwanted interactions. The system is built to empower users to express their preferences without judgment, fostering a safe and enjoyable environment for everyone.

## Goals
1. **Inclusivity**: Allow users to express their preferences freely without fear of judgment.
2. **Separation of Experiences**: Ensure that users seeking different types of interactions (e.g., casual chat, professional networking, or adult content) are matched appropriately.
3. **Empowerment**: Make all users feel valued and respected, regardless of their preferences.
4. **Safety**: Protect users from unwanted interactions and ensure a positive experience.

## Workflow

### 1. Tagging During Queue Entry
- Users select tags that represent their preferences or the type of interaction they are seeking.
- Tags are categorized into broad groups, such as:
  - **Casual Chat**: Friendly conversations, hobbies, interests.
  - **Professional**: Networking, career advice, skill sharing.
  - **Adult**: Explicit content, nudity, or other mature topics.
  - **Trolling**: Humor, pranks, or lighthearted mischief.

### 2. Tag-Based Matching
- When a user enters the queue, their selected tags are stored in the **queue topics table**.
- The system prioritizes matching users with overlapping tags.
- Users with conflicting tags (e.g., "Casual Chat" vs. "Trolling") are not matched to ensure compatibility.

### 3. Dynamic Tagging
- Users can update their tags during a session to refine their preferences.
- The system dynamically adjusts matching criteria based on updated tags.

### 4. Reporting and Feedback
- Users can report interactions that violate their expectations or platform guidelines.
- Reports are tied to tags to improve future matching accuracy.
- Feedback is used to refine the tagging system and ensure it aligns with user needs.

## Key Features

### Tag Categories
- **Casual Chat**: For users seeking friendly, non-controversial interactions.
- **Professional**: For users interested in networking or skill sharing.
- **Adult**: For users seeking mature or explicit content.
- **Trolling**: For users who enjoy humor or pranks.

### Tag Visibility
- Tags are private and not visible to other users.
- Users are matched based on their tags without revealing specific preferences.

### Empowerment Through Neutrality
- The platform does not make moral judgments about user preferences.
- All tags are treated equally to ensure inclusivity and respect.

## Challenges and Solutions

### Challenge: Preventing Abuse
- **Solution**: Implement robust reporting and moderation tools to address violations.

### Challenge: Balancing Freedom and Safety
- **Solution**: Use tags to separate experiences while allowing users to express themselves freely.

### Challenge: Encouraging Honest Tagging
- **Solution**: Emphasize the importance of accurate tagging for a better experience and ensure privacy.

## Future Enhancements
- Introduce AI-driven moderation to detect and address abusive behavior.
- Allow users to create custom tags for more personalized experiences.
- Provide analytics to help users understand how their tags influence matches.

## Crowd-Sourced Tag Enforcement

### Overview
To maintain the integrity of the tagging system and ensure accurate categorization, the platform incorporates a crowd-sourced tag enforcement mechanism. This system allows users to categorize others they share interactions with and leverages AI tools to verify certain types of reports.

### Workflow

1. **User Categorization**:
   - During or after an interaction, users can suggest tags for the other user based on their behavior or content.
   - Suggested tags are aggregated and reviewed to determine if they should be applied to the user's account.

2. **Tag Enforcement**:
   - If a tag receives enough consistent reports from different users, it is automatically enabled on the user's account.
   - Certain tags, such as those related to explicit content, may be force-enabled if verified.

3. **AI Verification**:
   - Locally processed AI tools in the user's browser are used to confirm reports of verifiable behaviors, such as nudity or explicit content.
   - AI verification ensures that reports are accurate and reduces the risk of false positives.

4. **Appeals and Moderation**:
   - Users can appeal tags that are applied to their account.
   - Moderators review appeals and make final decisions on disputed tags.

### Benefits
- **Accuracy**: Crowd-sourced tagging ensures that user behavior is accurately categorized.
- **Scalability**: Leveraging user input and AI tools allows the system to scale without relying solely on moderators.
- **Fairness**: Users have the ability to appeal tags, ensuring that the system remains fair and transparent.

### Challenges and Solutions

#### Challenge: False Reports
- **Solution**: Use AI verification and require consistent reports from multiple users before applying a tag.

#### Challenge: Privacy Concerns
- **Solution**: Process AI verification locally in the user's browser to ensure privacy and security.

#### Challenge: Abuse of the System
- **Solution**: Implement safeguards to prevent malicious reporting, such as limiting the number of reports a user can make in a short period.

### Future Enhancements
- Expand AI verification capabilities to cover a wider range of behaviors.
- Introduce reputation scores for users to weigh the reliability of their reports.
- Provide users with feedback on how their reports contribute to the system.
