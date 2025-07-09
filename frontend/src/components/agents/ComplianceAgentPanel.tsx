import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';

interface Document {
  id: string;
  originalName: string;
  mimeType: string;
  size: number;
  createdAt: string;
}

interface ComplianceStandard {
  id: string;
  name: string;
  version: string;
  category: string;
  description: string;
}

interface Agent {
  id: string;
  name: string;
  description: string;
  type: string;
  status: string;
  isActive: boolean;
}

interface AnalysisResult {
  id: string;
  documentTitle: string;
  overallScore: number;
  gaps: Array<{
    requirementId: string;
    description: string;
    severity: string;
    evidence: string;
  }>;
  recommendations: Array<{
    id: string;
    title: string;
    description: string;
    priority: string;
    category: string;
    actionItems: string[];
  }>;
  timestamp: string;
}

interface ComplianceAgentPanelProps {
  documents: Document[];
  onAnalyze: (documentId: string, standardIds: string[]) => Promise<AnalysisResult>;
  onViewReport: (analysisId: string) => void;
}

export const ComplianceAgentPanel: React.FC<ComplianceAgentPanelProps> = ({
  documents,
  onAnalyze,
  onViewReport,
}) => {
  const [selectedDocument, setSelectedDocument] = useState<string>('');
  const [selectedStandards, setSelectedStandards] = useState<string[]>([]);
  const [availableStandards, setAvailableStandards] = useState<ComplianceStandard[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResults, setAnalysisResults] = useState<AnalysisResult[]>([]);
  const [showCreateAgent, setShowCreateAgent] = useState(false);
  const [newAgentName, setNewAgentName] = useState('');
  const [newAgentDescription, setNewAgentDescription] = useState('');

  useEffect(() => {
    loadComplianceStandards();
    loadAgents();
  }, []);

  const loadComplianceStandards = async () => {
    try {
      const response = await fetch('/api/v1/agents/compliance/standards');
      const data = await response.json();
      if (data.success) {
        setAvailableStandards(data.data.standards);
      }
    } catch (error) {
      console.error('Failed to load compliance standards:', error);
    }
  };

  const loadAgents = async () => {
    try {
      const response = await fetch('/api/v1/agents?type=COMPLIANCE');
      const data = await response.json();
      if (data.success) {
        setAgents(data.data.agents);
      }
    } catch (error) {
      console.error('Failed to load agents:', error);
    }
  };

  const createComplianceAgent = async () => {
    if (!newAgentName.trim()) return;

    try {
      const response = await fetch('/api/v1/agents/compliance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newAgentName,
          description: newAgentDescription,
          modelProvider: 'mistral',
        }),
      });

      const data = await response.json();
      if (data.success) {
        setAgents([...agents, data.data.agent]);
        setShowCreateAgent(false);
        setNewAgentName('');
        setNewAgentDescription('');
      }
    } catch (error) {
      console.error('Failed to create compliance agent:', error);
    }
  };

  const handleAnalyze = async () => {
    if (!selectedDocument || selectedStandards.length === 0) return;

    setIsAnalyzing(true);
    try {
      const result = await onAnalyze(selectedDocument, selectedStandards);
      setAnalysisResults([result, ...analysisResults]);
    } catch (error) {
      console.error('Analysis failed:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'critical': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Compliance Analysis</h2>
        <Button onClick={() => setShowCreateAgent(true)}>
          Create Agent
        </Button>
      </div>

      {/* Agent Status */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Compliance Agents</h3>
        {agents.length === 0 ? (
          <p className="text-gray-500">No compliance agents available. Create one to get started.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {agents.map((agent) => (
              <div key={agent.id} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-gray-900">{agent.name}</h4>
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    agent.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {agent.status}
                  </span>
                </div>
                <p className="text-sm text-gray-600">{agent.description}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Analysis Form */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Document Analysis</h3>
        
        <div className="space-y-4">
          {/* Document Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Document
            </label>
            <select
              value={selectedDocument}
              onChange={(e) => setSelectedDocument(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Choose a document...</option>
              {documents.map((doc) => (
                <option key={doc.id} value={doc.id}>
                  {doc.originalName} ({(doc.size / 1024).toFixed(1)} KB)
                </option>
              ))}
            </select>
          </div>

          {/* Standards Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Compliance Standards
            </label>
            <div className="space-y-2 max-h-48 overflow-y-auto border border-gray-300 rounded-md p-3">
              {availableStandards.map((standard) => (
                <label key={standard.id} className="flex items-start space-x-3">
                  <input
                    type="checkbox"
                    checked={selectedStandards.includes(standard.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedStandards([...selectedStandards, standard.id]);
                      } else {
                        setSelectedStandards(selectedStandards.filter(id => id !== standard.id));
                      }
                    }}
                    className="mt-0.5 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-900">
                      {standard.name} ({standard.version})
                    </div>
                    <div className="text-xs text-gray-500">{standard.description}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Analyze Button */}
          <Button
            onClick={handleAnalyze}
            disabled={!selectedDocument || selectedStandards.length === 0 || isAnalyzing}
            className="w-full"
          >
            {isAnalyzing ? 'Analyzing...' : 'Analyze Compliance'}
          </Button>
        </div>
      </div>

      {/* Analysis Results */}
      {analysisResults.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Analysis Results</h3>
          <div className="space-y-4">
            {analysisResults.map((result) => (
              <div key={result.id} className="border rounded-lg p-4">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h4 className="font-medium text-gray-900">{result.documentTitle}</h4>
                    <p className="text-sm text-gray-500">
                      {new Date(result.timestamp).toLocaleString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className={`text-2xl font-bold ${getScoreColor(result.overallScore)}`}>
                      {result.overallScore.toFixed(1)}%
                    </div>
                    <div className="text-sm text-gray-500">Compliance Score</div>
                  </div>
                </div>

                {/* Gaps Summary */}
                {result.gaps.length > 0 && (
                  <div className="mb-3">
                    <h5 className="text-sm font-medium text-gray-700 mb-2">Compliance Gaps</h5>
                    <div className="flex flex-wrap gap-2">
                      {result.gaps.slice(0, 3).map((gap, index) => (
                        <span
                          key={index}
                          className={`px-2 py-1 text-xs rounded-full ${getSeverityColor(gap.severity)}`}
                        >
                          {gap.severity} - {gap.description.substring(0, 30)}...
                        </span>
                      ))}
                      {result.gaps.length > 3 && (
                        <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-600">
                          +{result.gaps.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Recommendations Summary */}
                {result.recommendations.length > 0 && (
                  <div className="mb-3">
                    <h5 className="text-sm font-medium text-gray-700 mb-2">Key Recommendations</h5>
                    <ul className="text-sm text-gray-600 space-y-1">
                      {result.recommendations.slice(0, 2).map((rec) => (
                        <li key={rec.id} className="flex items-start space-x-2">
                          <span className="flex-shrink-0 w-1 h-1 bg-blue-500 rounded-full mt-2"></span>
                          <span>{rec.title}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onViewReport(result.id)}
                >
                  View Full Report
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Create Agent Modal */}
      <Modal
        isOpen={showCreateAgent}
        onClose={() => setShowCreateAgent(false)}
        title="Create Compliance Agent"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Agent Name
            </label>
            <input
              type="text"
              value={newAgentName}
              onChange={(e) => setNewAgentName(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., SOX Compliance Agent"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={newAgentDescription}
              onChange={(e) => setNewAgentDescription(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
              placeholder="Describe the agent's purpose and capabilities..."
            />
          </div>

          <div className="flex justify-end space-x-3">
            <Button
              variant="outline"
              onClick={() => setShowCreateAgent(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={createComplianceAgent}
              disabled={!newAgentName.trim()}
            >
              Create Agent
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};