# Contributing to OpenBricks

Thank you for your interest in contributing to OpenBricks! This document provides guidelines and instructions for contributing.

## Code of Conduct

By participating in this project, you agree to abide by our Code of Conduct. Please be respectful and constructive in all interactions.

## How to Contribute

### Reporting Bugs

1. Check if the bug has already been reported in [Issues](https://github.com/danielgaio/openbricks/issues)
2. If not, create a new issue with:
   - A clear, descriptive title
   - Steps to reproduce the bug
   - Expected vs actual behavior
   - Your environment (OS, Docker version, etc.)
   - Relevant logs or screenshots

### Suggesting Features

1. Check existing issues and discussions for similar suggestions
2. Create a new issue with the "feature request" label
3. Clearly describe the feature and its use case
4. Explain why this feature would benefit the project

### Contributing Code

1. **Fork the repository**
   ```bash
   git clone https://github.com/your-username/openbricks.git
   cd openbricks
   ```

2. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **Set up the development environment**
   ```bash
   # Copy environment file
   cp .env.example .env
   
   # Start services in development mode
   docker compose -f docker-compose.dev.yml up -d
   
   # For dashboard development
   cd services/dashboard
   npm install
   npm run dev
   
   # For API development
   cd services/api
   npm install
   npm run dev
   ```

4. **Make your changes**
   - Follow the existing code style
   - Add tests for new functionality
   - Update documentation as needed

5. **Run tests**
   ```bash
   # API tests
   cd services/api && npm test
   
   # Dashboard tests
   cd services/dashboard && npm test
   ```

6. **Commit your changes**
   ```bash
   git add .
   git commit -m "feat: add your feature description"
   ```
   
   We follow [Conventional Commits](https://www.conventionalcommits.org/):
   - `feat:` for new features
   - `fix:` for bug fixes
   - `docs:` for documentation changes
   - `style:` for formatting changes
   - `refactor:` for code refactoring
   - `test:` for adding tests
   - `chore:` for maintenance tasks

7. **Push and create a Pull Request**
   ```bash
   git push origin feature/your-feature-name
   ```
   
   Then open a Pull Request on GitHub with:
   - A clear description of the changes
   - Reference to any related issues
   - Screenshots for UI changes

## Development Guidelines

### Code Style

- **JavaScript/TypeScript**: Follow ESLint configuration
- **Python**: Follow PEP 8, use Black for formatting
- **Go**: Use `gofmt` and follow standard Go conventions
- **SQL**: Use uppercase for keywords, lowercase for identifiers

### Architecture Principles

- Keep services loosely coupled
- Use environment variables for configuration
- Write meaningful error messages
- Include health check endpoints
- Document API endpoints with OpenAPI/Swagger

### Testing

- Write unit tests for business logic
- Write integration tests for API endpoints
- Aim for >80% code coverage on new code
- Test edge cases and error scenarios

### Documentation

- Update README.md for user-facing changes
- Add JSDoc/docstrings for public functions
- Include examples in documentation
- Keep CHANGELOG.md updated

## Project Structure

```
openbricks/
├── services/
│   ├── api/          # REST/GraphQL API (Node.js)
│   ├── auth/         # Authentication service (Go)
│   ├── dashboard/    # Web UI (React/TypeScript)
│   ├── notebooks/    # Jupyter integration
│   ├── query-engine/ # Spark query service
│   └── storage/      # Storage management (Python)
├── docker/           # Docker configurations
├── scripts/          # Utility scripts
└── docs/            # Documentation
```

## Getting Help

- Check the [Documentation](docs/)
- Ask questions in [Discussions](https://github.com/danielgaio/openbricks/discussions)
- Join our community chat (coming soon)

## License

By contributing to OpenBricks, you agree that your contributions will be licensed under the Apache License 2.0.
