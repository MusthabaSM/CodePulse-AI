import { Test, TestingModule } from '@nestjs/testing';
import { AiConsultantService } from './ai-consultant.service';
import { BusinessMetricsService } from '../analysis/business-metrics.service';
import { AnalysisService } from '../analysis/analysis.service';
import { AnalyticsService } from '../analytics/analytics.service';
import { LlmProvider } from './interfaces/llm.provider.interface';

describe('AiConsultantService', () => {
  let service: AiConsultantService;
  let mockLlmProvider: jest.Mocked<LlmProvider>;
  let mockBusinessMetricsService: jest.Mocked<BusinessMetricsService>;

  beforeEach(async () => {
    mockLlmProvider = {
      generateResponse: jest.fn(),
    };

    mockBusinessMetricsService = {
      calculateMetrics: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiConsultantService,
        { provide: 'LLM_PROVIDER', useValue: mockLlmProvider },
        { provide: BusinessMetricsService, useValue: mockBusinessMetricsService },
        { provide: AnalysisService, useValue: {} },
        { provide: AnalyticsService, useValue: {} },
      ],
    }).compile();

    service = module.get<AiConsultantService>(AiConsultantService);
  });

  describe('Repository Awareness Injection', () => {
    it('should inject repository name, owner, health score, and ML explanations into the system prompt', async () => {
      // Arrange
      const mockMetrics = {
        repository: {
          id: 'repo-123',
          name: 'TestApp',
          owner: 'TestOrg',
          healthScore: 85,
        },
        metrics: {
          estimatedMaintenanceCost: 15000,
          totalDebtHours: 200,
          productivityLossPercent: 5,
          releaseRiskPercent: 12.5,
          topRoiRefactoringTargets: [
            {
              filePath: 'src/main.ts',
              riskLevel: 'High',
              complexity: 25,
              churnCount: 15,
              bugFixCount: 5,
              authorEntropy: 1.2,
              debtHours: 12,
              annualSavings: 1000,
              topRiskFactors: ['Cyclomatic Complexity', 'High Churn'],
              executiveSummary: 'This file is a god class and needs refactoring.',
            },
          ],
        },
      };

      mockBusinessMetricsService.calculateMetrics.mockResolvedValue(mockMetrics as any);
      mockLlmProvider.generateResponse.mockResolvedValue('Mocked response');

      // Act
      await service.chat('repo-123', [{ role: 'user', content: 'hello' }]);

      // Assert
      expect(mockLlmProvider.generateResponse).toHaveBeenCalled();
      const generatedPrompt = mockLlmProvider.generateResponse.mock.calls[0][0];

      // Check Repository Identity
      expect(generatedPrompt).toContain('Repository Name: TestApp');
      expect(generatedPrompt).toContain('Repository Owner: TestOrg');
      expect(generatedPrompt).toContain('Health Score: 85');

      // Check File Metrics & ML Explanations
      expect(generatedPrompt).toContain('src/main.ts');
      expect(generatedPrompt).toContain('Risk: High');
      expect(generatedPrompt).toContain('Complexity: 25');
      expect(generatedPrompt).toContain('Bug Fixes: 5');
      expect(generatedPrompt).toContain('* Cyclomatic Complexity');
      expect(generatedPrompt).toContain('* High Churn');
      expect(generatedPrompt).toContain('This file is a god class and needs refactoring.');
    });
  });
});
