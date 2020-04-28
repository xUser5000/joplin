export interface AceEditorProps {
	style: any;
	theme: number;
	content: string,
	contentKey: string,
	contentMarkupLanguage: number,
	onChange(event: OnChangeEvent): void;
	onWillChange(event: any): void;
	onMessage(event: any): void;
	onScroll(event: any): void;
	markupToHtml: Function;
	htmlToMarkdown: Function;
	allAssets: Function;
	attachResources: Function;
	disabled: boolean;
	dispatch: Function;
	noteToolbar: any;
	searchMarkers: any,
	visiblePanes: string[],
	keyboardMode: string,
}

export interface RenderedBody {
	html: string;
	pluginAssets: any[];
}

export function defaultRenderedBody(): RenderedBody {
	return {
		html: '',
		pluginAssets: [],
	};
}
