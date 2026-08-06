module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/api', '<rootDir>/src'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testMatch: ['**/?(*.)+(spec|test).ts?(x)'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: 'api/tsconfig.json'
    }]
  },
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'api/**/*.{ts,js}',
    '!api/**/*.d.ts',
  ],
};
