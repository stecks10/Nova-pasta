declare module "puppeteer" {
  export interface Page {
    // Compatibilidade com diferentes versões do Puppeteer
    waitForTimeout?(ms: number): Promise<void>;
    setViewport(arg0: { width: number; height: number }): Promise<void>;
    setUserAgent(userAgent: string): Promise<void>;
    setDefaultTimeout(timeout: number): void;
    setDefaultNavigationTimeout(timeout: number): void;
    goto(url: string, options?: any): Promise<any>;
    waitForSelector(selector: string, options?: any): Promise<any>;
    $(selector: string): Promise<any>;
    $$(selector: string): Promise<any[]>;
    evaluate(fn: Function, ...args: any[]): Promise<any>;
    evaluateHandle(fn: Function, ...args: any[]): Promise<any>;
    frames(): Frame[];
    content(): Promise<string>;
    click(selector: string, options?: any): Promise<void>;
    type(selector: string, text: string, options?: any): Promise<void>;
    waitForNavigation(options?: any): Promise<any>;
  }

  export interface Frame {
    url(): string;
    $(selector: string): Promise<any>;
    $$(selector: string): Promise<any[]>;
    type(selector: string, text: string): Promise<void>;
    click(selector: string, options?: any): Promise<void>;
    evaluate(fn: Function, ...args: any[]): Promise<any>;
    waitForSelector(selector: string, options?: any): Promise<any>;
  }

  export interface Browser {
    newPage(): Promise<Page>;
    close(): Promise<void>;
    pages(): Promise<Page[]>;
  }

  export interface ElementHandle {
    click(options?: any): Promise<void>;
    type(text: string, options?: any): Promise<void>;
    evaluate(fn: Function, ...args: any[]): Promise<any>;
  }

  export function launch(options?: any): Promise<Browser>;
}
