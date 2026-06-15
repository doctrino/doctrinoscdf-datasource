import { InstanceId, VersionedId } from './types';

export function instanceStringAsId(instanceId: string): InstanceId {
  const index = instanceId.indexOf(':');
  const space = instanceId.slice(0, index);
  const externalId = instanceId.slice(index + 1);
  return { space: space, externalId: externalId };
}

export function instanceIdAsString(space: string, externalId: string) {
  return `${space}:${externalId}`;
}

export function versionedIdAsString(view: VersionedId) {
  return `${view.space}:${view.externalId}(version=${view.version})`;
}

export function versionedStringAsId(s: string): VersionedId {
  const colonIndex = s.indexOf(':');
  const space = s.slice(0, colonIndex);
  const rest = s.slice(colonIndex + 1);
  const parenIndex = rest.indexOf('(version=');
  const externalId = rest.slice(0, parenIndex);
  const versionWithParen = rest.slice(parenIndex + '(version='.length);
  const version = versionWithParen.endsWith(')') ? versionWithParen.slice(0, -1) : versionWithParen;
  return { space, externalId, version };
}

