// Lightweight AI Assistant - MCP Integration Ready
class AIAssistant {
  constructor() {
    this.isOpen = false;
    this.context = {
      data: [],
      lastAnalysis: null,
      userPreferences: {}
    };
    this.init();
  }

  init() {
    this.loadContext();
    this.addWelcomeMessage();
  }

  loadContext() {
    // Load conversation context from localStorage
    const stored = localStorage.getItem('ai-context');
    if (stored) {
      try {
        this.context = { ...this.context, ...JSON.parse(stored) };
      } catch (e) {
        console.error('Error loading AI context:', e);
      }
    }
  }

  saveContext() {
    localStorage.setItem('ai-context', JSON.stringify(this.context));
  }

  addWelcomeMessage() {
    if (!document.querySelector('.message.ai')) {
      this.addMessage('ai', 'Hello! I\'m your AI assistant. I can help you analyze your vulnerability data, provide insights, and answer questions about VPR scores. What would you like to know?');
    }
  }

  async processMessage(userMessage) {
    this.addMessage('user', userMessage);
    
    // Show typing indicator
    const typingIndicator = this.addMessage('ai', 'Analyzing...', true);
    
    try {
      // Analyze the message and generate response
      const response = await this.generateResponse(userMessage);
      
      // Remove typing indicator
      typingIndicator.remove();
      
      // Add AI response
      this.addMessage('ai', response);
      
    } catch (error) {
      typingIndicator.remove();
      this.addMessage('ai', 'I apologize, but I encountered an error processing your request. Please try again or rephrase your question.');
      console.error('AI processing error:', error);
    }
  }

  async generateResponse(message) {
    const lowerMessage = message.toLowerCase();
    const data = window.csvTools.data;
    
    // Update context with current data
    this.context.data = data;
    this.saveContext();

    // Simple pattern matching for common queries
    if (lowerMessage.includes('total') || lowerMessage.includes('sum')) {
      return this.getTotalAnalysis();
    }
    
    if (lowerMessage.includes('critical') && lowerMessage.includes('high')) {
      return this.getCriticalHighAnalysis();
    }
    
    if (lowerMessage.includes('trend') || lowerMessage.includes('over time')) {
      return this.getTrendAnalysis();
    }
    
    if (lowerMessage.includes('recommend') || lowerMessage.includes('priorit')) {
      return this.getPrioritizationRecommendations();
    }
    
    if (lowerMessage.includes('summary') || lowerMessage.includes('overview')) {
      return this.getDataSummary();
    }
    
    if (lowerMessage.includes('help') || lowerMessage.includes('what can you do')) {
      return this.getHelpMessage();
    }

    // Default intelligent response
    return this.getContextualResponse(message);
  }

  getTotalAnalysis() {
    const data = this.context.data;
    if (!data.length) {
      return "No vulnerability data has been uploaded yet. Please upload a CSV file to get started with analysis.";
    }

    const scores = this.calculateScores(data);
    const total = Object.values(scores).reduce((a, b) => a + b, 0);
    
    return `Based on your current data:
    
📊 **Total VPR Score**: ${total.toFixed(1)}

🔴 **Critical**: ${scores.critical.toFixed(1)} (${((scores.critical/total)*100).toFixed(1)}%)
🟠 **High**: ${scores.high.toFixed(1)} (${((scores.high/total)*100).toFixed(1)}%)
🟡 **Medium**: ${scores.medium.toFixed(1)} (${((scores.medium/total)*100).toFixed(1)}%)
🟢 **Low**: ${scores.low.toFixed(1)} (${((scores.low/total)*100).toFixed(1)}%)

This represents analysis of ${data.length} vulnerability records.`;
  }

  getCriticalHighAnalysis() {
    const data = this.context.data;
    if (!data.length) {
      return "Please upload vulnerability data first to analyze critical and high severity items.";
    }

    const criticalItems = data.filter(item => (item.severity || '').toLowerCase() === 'critical');
    const highItems = data.filter(item => (item.severity || '').toLowerCase() === 'high');
    
    const criticalVPR = criticalItems.reduce((sum, item) => sum + (parseFloat(item.vpr) || 0), 0);
    const highVPR = highItems.reduce((sum, item) => sum + (parseFloat(item.vpr) || 0), 0);
    
    return `🚨 **Critical & High Severity Analysis**:

**Critical Vulnerabilities**: ${criticalItems.length} items (VPR: ${criticalVPR.toFixed(1)})
**High Vulnerabilities**: ${highItems.length} items (VPR: ${highVPR.toFixed(1)})

**Combined Impact**: ${(criticalVPR + highVPR).toFixed(1)} VPR points
**Percentage of Total**: ${(((criticalVPR + highVPR) / this.getTotalVPR()) * 100).toFixed(1)}%

💡 **Recommendation**: Focus on these ${criticalItems.length + highItems.length} high-impact vulnerabilities first for maximum risk reduction.`;
  }

  getTrendAnalysis() {
    return `📈 **Trend Analysis**:

Currently, trend analysis shows data distribution across severity levels. For more detailed trending:

1. Upload multiple CSV files over time
2. Include timestamp data in your files
3. I'll track changes in VPR scores over time

The current distribution chart shows your risk profile, helping identify if you have a concentration in any particular severity level.`;
  }

  getPrioritizationRecommendations() {
    const data = this.context.data;
    if (!data.length) {
      return "Upload your vulnerability data to receive prioritization recommendations.";
    }

    const scores = this.calculateScores(data);
    const total = this.getTotalVPR();
    
    let recommendations = "🎯 **Prioritization Recommendations**:\n\n";
    
    if (scores.critical > 0) {
      recommendations += `1. **Immediate Action**: Address ${data.filter(i => i.severity === 'critical').length} critical vulnerabilities (${scores.critical.toFixed(1)} VPR)\n`;
    }
    
    if (scores.high > 0) {
      recommendations += `2. **Short Term**: Plan for ${data.filter(i => i.severity === 'high').length} high severity items (${scores.high.toFixed(1)} VPR)\n`;
    }
    
    if (scores.medium > 0) {
      recommendations += `3. **Medium Term**: Schedule ${data.filter(i => i.severity === 'medium').length} medium severity fixes (${scores.medium.toFixed(1)} VPR)\n`;
    }
    
    recommendations += `\n💡 **Focus on the top ${Math.min(10, data.length)} highest VPR items first for maximum impact.**`;
    
    return recommendations;
  }

  getDataSummary() {
    const data = this.context.data;
    if (!data.length) {
      return "No data available. Please upload a CSV file containing vulnerability information.";
    }

    const scores = this.calculateScores(data);
    const avgVPR = this.getTotalVPR() / data.length;
    
    return `📋 **Data Summary**:

**Total Records**: ${data.length}
**Average VPR**: ${avgVPR.toFixed(2)}
**Distribution**: ${Object.entries(scores).map(([k,v]) => `${k}: ${v.toFixed(1)}`).join(', ')}

**Top Risk Areas**: ${scores.critical > 0 ? 'Critical vulnerabilities need immediate attention' : scores.high > 0 ? 'High severity items should be prioritized' : 'Risk level appears manageable'}

Ready to dive deeper into any specific area?`;
  }

  getHelpMessage() {
    return `🤖 **AI Assistant Capabilities**:

I can help you with:
• **Data Analysis** - Total scores, distributions, trends
• **Prioritization** - Which vulnerabilities to fix first
• **Risk Assessment** - Understanding your security posture
• **Recommendations** - Best practices for vulnerability management

**Example Questions**:
• "What's my total VPR score?"
• "How many critical vulnerabilities do I have?"
• "What should I prioritize first?"
• "Give me a summary of my data"

**MCP Integration**: This assistant is designed to work with Model Context Protocol for enhanced capabilities.`;
  }

  getContextualResponse(message) {
    const data = this.context.data;
    
    if (!data.length) {
      return `I understand you're asking about "${message}". To provide accurate analysis, please upload your vulnerability data first. Once you have data loaded, I can give you detailed insights!`;
    }
    
    return `Thanks for your question about "${message}". Based on your current data of ${data.length} vulnerability records, I can provide various analyses. Try asking specific questions like "What's my risk summary?" or "Which vulnerabilities should I fix first?" for more targeted insights.`;
  }

  calculateScores(data) {
    const scores = { critical: 0, high: 0, medium: 0, low: 0 };
    
    data.forEach(item => {
      const severity = (item.severity || '').toLowerCase();
      const vpr = parseFloat(item.vpr || 0);
      
      if (scores.hasOwnProperty(severity)) {
        scores[severity] += vpr;
      }
    });
    
    return scores;
  }

  getTotalVPR() {
    const scores = this.calculateScores(this.context.data);
    return Object.values(scores).reduce((a, b) => a + b, 0);
  }

  addMessage(sender, content, isTemporary = false) {
    const chatContainer = document.getElementById('aiChat');
    if (!chatContainer) return;

    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}`;
    if (isTemporary) messageDiv.classList.add('temporary');
    
    messageDiv.innerHTML = content.replace(/\n/g, '<br>');
    
    chatContainer.appendChild(messageDiv);
    chatContainer.scrollTop = chatContainer.scrollHeight;
    
    return messageDiv;
  }

  toggle() {
    const panel = document.getElementById('aiPanel');
    if (panel) {
      this.isOpen = !this.isOpen;
      panel.classList.toggle('hidden', !this.isOpen);
    }
  }
}

// UI Functions
function toggleAI() {
  if (!window.aiAssistant) {
    window.aiAssistant = new AIAssistant();
  }
  window.aiAssistant.toggle();
}

function sendMessage() {
  const input = document.getElementById('aiInput');
  const message = input.value.trim();
  
  if (!message) return;
  
  if (!window.aiAssistant) {
    window.aiAssistant = new AIAssistant();
  }
  
  window.aiAssistant.processMessage(message);
  input.value = '';
}

// Initialize AI Assistant
document.addEventListener('DOMContentLoaded', () => {
  window.aiAssistant = new AIAssistant();
});
