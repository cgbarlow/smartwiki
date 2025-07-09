import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';

interface ComplianceGap {
  requirementId: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  evidence: string;
  recommendation: string;
}

interface Recommendation {
  id: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category: string;
  actionItems: string[];
}

interface RiskAssessment {
  overallRisk: 'low' | 'medium' | 'high' | 'critical';
  riskFactors: Array<{
    factor: string;
    impact: 'low' | 'medium' | 'high' | 'critical';
    likelihood: 'low' | 'medium' | 'high';
    description: string;
  }>;
  mitigationStrategies: string[];
}

interface ComplianceStandard {
  id: string;
  name: string;
  version: string;
  category: string;
  description: string;
}

interface ComplianceReport {
  id: string;
  documentId: string;
  documentTitle: string;
  analysisDate: Date;
  standards: ComplianceStandard[];
  overallScore: number;
  gaps: ComplianceGap[];
  recommendations: Recommendation[];
  riskAssessment: RiskAssessment;
}

interface ComplianceReportViewerProps {
  report: ComplianceReport;
  onExport: (format: 'pdf' | 'docx' | 'json') => void;
  onClose: () => void;
}

export const ComplianceReportViewer: React.FC<ComplianceReportViewerProps> = ({
  report,
  onExport,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'gaps' | 'recommendations' | 'risk'>('overview');

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBackground = (score: number) => {
    if (score >= 80) return 'bg-green-100';
    if (score >= 60) return 'bg-yellow-100';
    return 'bg-red-100';
  };

  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'urgent': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-green-100 text-green-800 border-green-200';
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk.toLowerCase()) {
      case 'critical': return 'text-red-600 bg-red-100';
      case 'high': return 'text-orange-600 bg-orange-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      default: return 'text-green-600 bg-green-100';
    }
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'gaps', label: `Gaps (${report.gaps.length})`, icon: '⚠️' },
    { id: 'recommendations', label: `Recommendations (${report.recommendations.length})`, icon: '💡' },
    { id: 'risk', label: 'Risk Assessment', icon: '🔍' },
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full h-5/6 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Compliance Analysis Report</h1>
            <p className="text-gray-600">{report.documentTitle}</p>
            <p className="text-sm text-gray-500">
              Generated on {report.analysisDate.toLocaleDateString()}
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <Button onClick={() => onExport('pdf')} variant="outline" size="sm">
              Export PDF
            </Button>
            <Button onClick={() => onExport('docx')} variant="outline" size="sm">
              Export Word
            </Button>
            <Button onClick={() => onExport('json')} variant="outline" size="sm">
              Export JSON
            </Button>
            <Button onClick={onClose} variant="outline" size="sm">
              Close
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-6 py-3 text-sm font-medium border-b-2 ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Score Summary */}
              <div className={`rounded-lg p-6 ${getScoreBackground(report.overallScore)}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">Overall Compliance Score</h3>
                    <p className="text-gray-600">Based on analysis of {report.standards.length} standards</p>
                  </div>
                  <div className={`text-4xl font-bold ${getScoreColor(report.overallScore)}`}>
                    {report.overallScore.toFixed(1)}%
                  </div>
                </div>
              </div>

              {/* Standards Analyzed */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Standards Analyzed</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {report.standards.map((standard) => (
                    <div key={standard.id} className="border rounded-lg p-4">
                      <h4 className="font-medium text-gray-900">{standard.name}</h4>
                      <p className="text-sm text-gray-600">Version: {standard.version}</p>
                      <p className="text-sm text-gray-500 mt-1">{standard.description}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="text-2xl font-bold text-red-600">
                    {report.gaps.filter(g => g.severity === 'critical' || g.severity === 'high').length}
                  </div>
                  <div className="text-sm text-red-800">Critical/High Issues</div>
                </div>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="text-2xl font-bold text-yellow-600">
                    {report.gaps.filter(g => g.severity === 'medium').length}
                  </div>
                  <div className="text-sm text-yellow-800">Medium Issues</div>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="text-2xl font-bold text-blue-600">
                    {report.recommendations.length}
                  </div>
                  <div className="text-sm text-blue-800">Recommendations</div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'gaps' && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">Compliance Gaps</h3>
              {report.gaps.length === 0 ? (
                <p className="text-gray-500">No compliance gaps identified.</p>
              ) : (
                <div className="space-y-4">
                  {report.gaps.map((gap, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-medium text-gray-900">{gap.description}</h4>
                        <span className={`px-2 py-1 text-xs rounded-full border ${getSeverityColor(gap.severity)}`}>
                          {gap.severity.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">
                        <strong>Requirement:</strong> {gap.requirementId}
                      </p>
                      {gap.evidence && (
                        <p className="text-sm text-gray-600 mb-2">
                          <strong>Evidence:</strong> {gap.evidence}
                        </p>
                      )}
                      {gap.recommendation && (
                        <p className="text-sm text-gray-600">
                          <strong>Recommendation:</strong> {gap.recommendation}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'recommendations' && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">Recommendations</h3>
              {report.recommendations.length === 0 ? (
                <p className="text-gray-500">No recommendations available.</p>
              ) : (
                <div className="space-y-4">
                  {report.recommendations.map((rec) => (
                    <div key={rec.id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-medium text-gray-900">{rec.title}</h4>
                        <span className={`px-2 py-1 text-xs rounded-full border ${getPriorityColor(rec.priority)}`}>
                          {rec.priority.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-3">{rec.description}</p>
                      <div className="text-sm text-gray-500 mb-2">
                        <strong>Category:</strong> {rec.category}
                      </div>
                      {rec.actionItems.length > 0 && (
                        <div>
                          <strong className="text-sm text-gray-700">Action Items:</strong>
                          <ul className="list-disc list-inside text-sm text-gray-600 mt-1 space-y-1">
                            {rec.actionItems.map((item, index) => (
                              <li key={index}>{item}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'risk' && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900">Risk Assessment</h3>
              
              {/* Overall Risk */}
              <div className={`rounded-lg p-4 ${getRiskColor(report.riskAssessment.overallRisk)}`}>
                <h4 className="font-medium text-gray-900 mb-2">Overall Risk Level</h4>
                <div className="text-2xl font-bold">
                  {report.riskAssessment.overallRisk.toUpperCase()}
                </div>
              </div>

              {/* Risk Factors */}
              {report.riskAssessment.riskFactors.length > 0 && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Risk Factors</h4>
                  <div className="space-y-3">
                    {report.riskAssessment.riskFactors.map((factor, index) => (
                      <div key={index} className="border rounded-lg p-4">
                        <div className="flex items-start justify-between mb-2">
                          <h5 className="font-medium text-gray-900">{factor.factor}</h5>
                          <div className="flex space-x-2">
                            <span className={`px-2 py-1 text-xs rounded ${getRiskColor(factor.impact)}`}>
                              Impact: {factor.impact}
                            </span>
                            <span className={`px-2 py-1 text-xs rounded ${getRiskColor(factor.likelihood)}`}>
                              Likelihood: {factor.likelihood}
                            </span>
                          </div>
                        </div>
                        <p className="text-sm text-gray-600">{factor.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Mitigation Strategies */}
              {report.riskAssessment.mitigationStrategies.length > 0 && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Mitigation Strategies</h4>
                  <ul className="space-y-2">
                    {report.riskAssessment.mitigationStrategies.map((strategy, index) => (
                      <li key={index} className="flex items-start space-x-2">
                        <span className="flex-shrink-0 w-2 h-2 bg-blue-500 rounded-full mt-2"></span>
                        <span className="text-sm text-gray-600">{strategy}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};