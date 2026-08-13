export type AdPlacement = 'menu' | 'post_run' | 'post_match' | 'rewarded_optional';

export interface AdProvider {
  show(placement: AdPlacement): Promise<boolean>;
}

export class NoopAdProvider implements AdProvider {
  async show(_placement: AdPlacement): Promise<boolean> { return false; }
}

export const adProvider: AdProvider = new NoopAdProvider();
