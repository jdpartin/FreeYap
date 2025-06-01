# Copilot Custom Instructions

This project is called FreeYap, a Node.js-based anonymous chat platform. Users connect based on shared interests while maintaining anonymity. It uses PostgreSQL, Express, EJS, Bootstrap, WebRTC, TypeScript, and Qdrant. Prioritizes scalability, efficiency, privacy, and security.

## Technologies:
- **PostgreSQL (Render)**: Relational database.
- **Node.js**: Backend runtime.
- **Express**: Web framework.
- **EJS**: Template engine.
- **Bootstrap**: Frontend styling.
- **WebRTC**: Video/audio chat.
- **TypeScript**: Type safety.
- **JavaScript**: Client-side scripting (phasing out server-side).
- **Qdrant**: Vector database for matching/search.

## Getting Started:

### Prerequisites:
- Node.js installed
- npm package manager
- Required environment variables configured (.env file)

### Starting the Application:
1. **Install Dependencies** (if not already done):
   ```powershell
   npm install
   ```

2. **Build the TypeScript Project**:
   ```powershell
   npm run build
   ```

3. **Start the Application**:
   ```powershell
   npm start
   ```
   - This runs `node dist/index.js`
   - Application will start on port 3000 by default
   - Access at: http://localhost:3000

### Development Notes:
- The project uses TypeScript source files in `src/` directory
- Built JavaScript files are output to `dist/` directory
- Always run `npm run build` after making changes to TypeScript files
- If port 3000 is in use, check for existing running instances

## Guidelines:

### General:
1. Implement specific changes only.
2. Avoid reintroducing removed features.
3. Verify code before changes.
4. Avoid assumptions; verify functions/endpoints.
5. Always read the entire file before making changes.
6. Check for other instances of issues when they could exist in multiple places.

### Planning:
1. Analyze tasks and plan steps.
2. Communicate plans before execution.
3. Implement systematically and validate changes.

### Code Style:
1. Use Allman style.
2. Follow project structure/naming.
3. Use CommonJS modules.
4. **CRITICAL**: Always add a new line before function declarations to avoid placing them inside comments or beside closing brackets. This prevents syntax errors and maintains proper code structure.

### Validation & Error Handling:
1. Validate API inputs.
2. Implement robust error handling.
3. Reference `past_errors.md` for known issues.

### Documentation:
1. Comment/document new functions.
2. Update documentation for changes.
3. Use `snake_case` for DB objects and `camelCase` for parameters.

### Testing:
1. Ensure testability with mock data.
2. Avoid affecting production data.

### Performance:
1. Optimize for scalability.
2. Ensure compatibility with the stack.

### Collaboration:
1. Check for concurrent changes.
2. Communicate dependencies/conflicts.

### Technology Notes:
1. **WebRTC**: Proper signaling/media handling.
2. **Qdrant**: Efficient queries/indexing.
3. **PostgreSQL**: Best practices for design/queries.

### Environment & Platform Notes:
1. **PowerShell**: Use semicolon (`;`) for command separation instead of ampersand-ampersand (`&&`) which works in bash/cmd but not in PowerShell.
   Example: Use `cd directory; node script.js` instead of `cd directory && node script.js`.
2. **Windows Paths**: When writing paths for filesystem operations, use double backslashes (`\\`) or single forward slashes (`/`).
3. **Terminal Commands**: Ensure terminal commands are compatible with PowerShell syntax when generating scripts.

### Workflow:
1. Avoid removing relevant comments.
2. Follow up on related changes.
3. Validate correctness by testing.

### Communication:
1. Clarify unclear requirements.
2. Explain significant changes.