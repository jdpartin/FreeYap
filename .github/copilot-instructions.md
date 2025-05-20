# Copilot Custom Instructions

This project is called FreeYap. It is a Node.js-based social media platform for anonymous chat. Users can connect with others based on shared interests and preferences while maintaining their anonymity. The platform uses a tagging system to categorize users and facilitate matching, ensuring a safe and enjoyable experience for all participants. The project prioritizes scalability, efficiency, user privacy, and security. Similar platforms include Omegle, Chatroulette, and Tinychat.

## Technologies:
- **PostgreSQL (Render)**: For relational database management.
- **Node.js**: Backend runtime environment.
- **Express**: Web application framework.
- **EJS**: Template engine for rendering views.
- **Bootstrap**: Frontend styling framework.
- **WebRTC**: Enables video/audio chat functionality.
- **TypeScript**: Ensures type safety in the codebase.
- **JavaScript**: Used for client-side scripting (being phased out on the server side).
- **Qdrant**: Vector database provider for advanced matching and search capabilities.

## Development Guidelines:

### General Principles:
1. **Focus on Specific Changes**: Implement changes specific to the task or feature requested without altering unrelated parts of the code.
2. **Avoid Reintroducing Removed Features**: Do not reintroduce old or partially removed features unless explicitly instructed. Ensure changes align with current requirements.
3. **Verify Before Changing**: Always check the existing code before making changes to ensure your knowledge is up-to-date. Confirm the existence of external functions or endpoints before using them.
4. **Avoid Assumptions**: Do not assume the name or behavior of a function, endpoint, or feature. Verify its existence and behavior before use. If it cannot be located, clearly state this and suggest next steps.

### Code Style:
1. Use **Allman style** for code formatting. If you encounter code that is not in Allman style, update it to conform to this style.
2. Follow the existing project structure and naming conventions.
3. Use **CommonJS modules** (`require`/`module.exports`) for Node.js.

### Validation and Error Handling:
1. Validate all user input in API endpoints.
2. Implement robust error handling for all new features.
3. When encountering an error, check the `past_errors.md` file in the `documentation/` folder to see if it has been encountered and resolved before.

### Documentation:
1. Add comments or documentation for new functions or significant changes to improve maintainability.
2. Update relevant documentation files (e.g., `documentation/`) when making changes that affect the system's behavior. **Always ensure the documentation folder is referenced and updated when changes are made.**
3. Ensure that naming conventions for parameters and database objects are clearly documented.
4. Add notes about any errors encountered in the past to the `past_errors.md` file in the `documentation/` folder.

### Naming Conventions:
1. **Tables and Columns**: Use `snake_case` for all table and column names in the database.
2. **Parameters**: Use `camelCase` for all parameters in stored procedures.

### Testing:
1. Ensure changes are testable and include test cases or instructions for testing where applicable.
2. Use mock data or test environments to validate changes without affecting production data.

### Performance and Scalability:
1. Optimize for performance and scalability where relevant.
2. Ensure compatibility with the project's technology stack.

### Collaboration:
1. Be mindful of concurrent changes by the user. Always check the latest state of the code before implementing new features.
2. Communicate clearly about dependencies or potential conflicts with other parts of the system.

### Technology-Specific Notes:
1. **WebRTC**: Ensure proper signaling and media handling for video/audio chat.
2. **Vector Database (Qdrant)**: Use efficient queries and indexing for vector-based operations.
3. **PostgreSQL**: Follow best practices for relational database design and query optimization.

### Workflow:
1. Avoid removing comments unless they are no longer relevant.
2. Follow up with other needed changes as a result of any modification.
3. Validate the correctness of changes by running the application or relevant tests.

### Communication:
1. If requirements or context are unclear, ask for clarification.
2. Provide detailed explanations for significant changes or decisions made during development.