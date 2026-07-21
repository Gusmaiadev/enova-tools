// Stub de 'server-only' para os testes: no vitest (ambiente node) o pacote real
// lanca porque acha que esta num bundle client. O codigo sob teste e logica pura
// (geometria, quadtree), nao toca rede nem Firebase.
export {}
