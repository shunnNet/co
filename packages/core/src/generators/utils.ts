/**
 * Sanitizes the output from a language model by removing code blocks.
 *
 * This function checks if the provided content contains any code blocks
 * enclosed within triple backticks (```...```). If such code blocks are found,
 * it removes them from the content. Otherwise, it returns the content as is.
 *
 * @param content - The string content to be sanitized.
 * @returns The sanitized content with code blocks removed if any were found.
 */
export function sanitizeLLMOutput(content: string) {
  if (content.match(/```[\s\S]*?```/)) {
    return content.replace(/```.*/g, '')
  }
  else {
    return content
  }
};
