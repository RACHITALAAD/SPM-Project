export function formatWhen(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatBytes(size) {
  const value = Number(size) || 0;
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

export function closesIn(iso) {
  const diff = new Date(iso).getTime() - Date.now();
  if (diff <= 0) return 'Deadline passed';
  const hours = Math.round(diff / 36e5);
  if (hours < 1) return 'Closes in under an hour';
  if (hours < 24) return `Closes in ${hours} hour${hours === 1 ? '' : 's'}`;
  const days = Math.round(hours / 24);
  return `Closes in ${days} day${days === 1 ? '' : 's'}`;
}

export function greeting(name) {
  const hour = new Date().getHours();
  const part = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const words = String(name || 'there').trim().split(/\s+/).filter(Boolean);
  const titles = new Set(['prof.', 'prof', 'dr.', 'dr', 'mr.', 'ms.', 'mrs.']);
  const first = words[0] && titles.has(words[0].toLowerCase()) && words[1] ? words[1] : words[0] || 'there';
  return `${part}, ${first}`;
}

export function toLocalInput(iso) {
  const date = new Date(iso);
  const pad = (value) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export async function errorMessage(error, fallback) {
  if (!error?.response) {
    return 'Cannot reach the server. Make sure the API and MongoDB are running.';
  }
  let data = error.response.data;
  if (typeof Blob !== 'undefined' && data instanceof Blob) {
    try {
      data = JSON.parse(await data.text());
    } catch {
      data = null;
    }
  }
  return data?.message || fallback;
}

export function submissionLabel(item) {
  if (item.submission?.evaluation) return { label: 'Evaluated', tone: 'evaluated' };
  if (item.submission) return { label: 'Submitted', tone: 'submitted' };
  if (new Date(item.deadline).getTime() <= Date.now()) return { label: 'Missed', tone: 'missed' };
  return { label: 'Not submitted', tone: 'pending' };
}
