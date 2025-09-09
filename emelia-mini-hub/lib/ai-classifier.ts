interface ClassificationResult {
  label: string
  confidence: number
}

export async function classifyResponse(
  content: string, 
  subject?: string | null
): Promise<ClassificationResult> {
  try {
    // In a real implementation, you would use an LLM API like OpenAI, Anthropic, or a local model
    // For this demo, we'll use a more sophisticated heuristic approach
    
    const classification = await sophisticatedHeuristicClassification(content, subject)
    
    return classification
  } catch (error) {
    console.error('AI Classification error:', error)
    
    // Fallback to simple heuristic
    return {
      label: simpleHeuristicClassification(content),
      confidence: 0.3
    }
  }
}

async function sophisticatedHeuristicClassification(
  content: string, 
  subject?: string | null
): Promise<ClassificationResult> {
  const lowerContent = content.toLowerCase()
  const lowerSubject = (subject || '').toLowerCase()
  
  // Combined content for analysis
  const combinedText = `${lowerSubject} ${lowerContent}`
  
  // Weighted scoring system
  const scores = {
    INTERESSE: 0,
    A_RAPPELER: 0,
    NEUTRE: 0,
    PAS_INTERESSE: 0,
    INJOIGNABLE: 0,
    OPT_OUT: 0,
  }
  
  // Interest patterns (French and English)
  const interestPatterns = [
    /intéressé|interested|interest/gi,
    /book.*call|rendez.?vous|meeting|réunion/gi,
    /tell.*more|en savoir plus|more info|plus d'info/gi,
    /sounds.*good|ça.*intéresse|that.*good|parfait/gi,
    /let.*talk|parlons|discuss|discuter/gi,
    /when.*available|quand.*libre|disponible/gi
  ]
  
  // Callback patterns
  const callbackPatterns = [
    /rappel|call.*back|later|plus tard/gi,
    /busy|occupé|not.*time|pas.*temps/gi,
    /next.*week|semaine.*prochaine|mois.*prochain/gi,
    /contact.*later|recontact|revoir.*plus tard/gi
  ]
  
  // Not interested patterns
  const notInterestedPatterns = [
    /not.*interested|pas.*intéressé|no.*interest/gi,
    /not.*relevant|pas.*pertinent|not.*for.*us/gi,
    /no.*thank|non.*merci|decline|refus/gi,
    /not.*right|pas.*bon.*moment|wrong.*timing/gi
  ]
  
  // Unsubscribe patterns
  const unsubscribePatterns = [
    /unsubscribe|désabonner|remove.*list/gi,
    /stop.*email|arrêt.*email|no.*more/gi,
    /opt.*out|retirer.*liste/gi,
    /delete.*contact|supprimer.*contact/gi
  ]
  
  // Out of office patterns
  const oooPatterns = [
    /out.*office|absent|vacation|congé/gi,
    /away.*message|message.*absence/gi,
    /automatic.*reply|réponse.*automatique/gi,
    /unavailable|indisponible|not.*available/gi
  ]
  
  // Calculate scores
  scores.INTERESSE = countMatches(combinedText, interestPatterns) * 3
  scores.A_RAPPELER = countMatches(combinedText, callbackPatterns) * 2
  scores.PAS_INTERESSE = countMatches(combinedText, notInterestedPatterns) * 4
  scores.OPT_OUT = countMatches(combinedText, unsubscribePatterns) * 5
  scores.INJOIGNABLE = countMatches(combinedText, oooPatterns) * 3
  
  // Additional context clues
  if (lowerContent.includes('?') || lowerContent.includes('question')) {
    scores.INTERESSE += 1
  }
  
  if (lowerContent.length < 20) {
    scores.NEUTRE += 1
  }
  
  // Find the highest score
  const maxScore = Math.max(...Object.values(scores))
  const predictedLabel = Object.keys(scores).find(key => 
    scores[key as keyof typeof scores] === maxScore
  ) || 'NEUTRE'
  
  // Calculate confidence based on score difference
  const sortedScores = Object.values(scores).sort((a, b) => b - a)
  const confidence = maxScore === 0 ? 0.1 : 
    Math.min(0.95, 0.3 + (maxScore - sortedScores[1]) * 0.1)
  
  return {
    label: predictedLabel,
    confidence
  }
}

function countMatches(text: string, patterns: RegExp[]): number {
  return patterns.reduce((count, pattern) => {
    const matches = text.match(pattern)
    return count + (matches ? matches.length : 0)
  }, 0)
}

function simpleHeuristicClassification(content: string): string {
  const lowerContent = content.toLowerCase()
  
  if (lowerContent.includes('intéressé') || lowerContent.includes('interested')) {
    return 'INTERESSE'
  }
  
  if (lowerContent.includes('rappel') || lowerContent.includes('call back')) {
    return 'A_RAPPELER'
  }
  
  if (lowerContent.includes('not interested') || lowerContent.includes('pas intéressé')) {
    return 'PAS_INTERESSE'
  }
  
  if (lowerContent.includes('unsubscribe') || lowerContent.includes('remove')) {
    return 'OPT_OUT'
  }
  
  if (lowerContent.includes('out of office') || lowerContent.includes('absent')) {
    return 'INJOIGNABLE'
  }
  
  return 'NEUTRE'
}

// Example integration with OpenAI (commented out for demo)
/*
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function classifyResponseWithOpenAI(
  content: string,
  subject?: string | null
): Promise<ClassificationResult> {
  try {
    const prompt = `
Classify this email response into one of these categories:
- INTERESSE: Shows interest in the offer/product
- A_RAPPELER: Wants to be contacted later or at a different time
- NEUTRE: Neutral response or unclear intent
- PAS_INTERESSE: Not interested in the offer
- INJOIGNABLE: Out of office, unavailable, or similar
- OPT_OUT: Wants to unsubscribe or be removed

Subject: ${subject || 'No subject'}
Content: ${content}

Respond with JSON: {"label": "CATEGORY", "confidence": 0.95}
`

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }],
      temperature: 0,
      max_tokens: 100,
    })

    const result = JSON.parse(response.choices[0].message.content || '{}')
    return {
      label: result.label || 'NEUTRE',
      confidence: Math.min(0.95, Math.max(0.1, result.confidence || 0.5))
    }
  } catch (error) {
    console.error('OpenAI classification error:', error)
    return sophisticatedHeuristicClassification(content, subject)
  }
}
*/