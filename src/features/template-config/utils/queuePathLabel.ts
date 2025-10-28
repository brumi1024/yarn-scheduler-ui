const DEFAULT_QUEUE_PATH_LABEL_MAX_LENGTH = 40;

export function formatQueuePathLabel(
  path: string,
  maxLength: number = DEFAULT_QUEUE_PATH_LABEL_MAX_LENGTH,
): string {
  if (path.length <= maxLength) {
    return path;
  }

  const sliceLength = Math.max(0, maxLength - 3);
  const prefixLength = Math.max(1, Math.floor(sliceLength / 2));
  const suffixLength = Math.max(1, sliceLength - prefixLength);

  return `${path.slice(0, prefixLength)}...${path.slice(-suffixLength)}`;
}
