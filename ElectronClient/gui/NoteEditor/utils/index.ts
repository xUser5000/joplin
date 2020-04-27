import { useState, useCallback, useMemo } from 'react';

// eslint-disable-next-line no-unused-vars
import AsyncActionQueue from '../../../lib/AsyncActionQueue';

const { bridge } = require('electron').remote.require('./bridge');
const { reg } = require('lib/registry.js');
const { shim } = require('lib/shim');
const BaseModel = require('lib/BaseModel.js');
const SearchEngine = require('lib/services/SearchEngine');

export interface FormNote {
	id: string,
	title: string,
	body: string,
	parent_id: string,
	is_todo: number,
	bodyEditorContent?: any,
	markup_language: number,
	user_updated_time: number,

	hasChanged: boolean,

	// Getting the content from the editor can be a slow process because that content
	// might need to be serialized first. For that reason, the wrapped editor (eg TinyMCE)
	// first emits onWillChange when there is a change. That event does not include the
	// editor content. After a few milliseconds (eg if the user stops typing for long
	// enough), the editor emits onChange, and that event will include the editor content.
	//
	// Both onWillChange and onChange events include a changeId property which is used
	// to link the two events together. It is used for example to detect if a new note
	// was loaded before the current note was saved - in that case the changeId will be
	// different. The two properties bodyWillChangeId and bodyChangeId are used to save
	// this info with the currently loaded note.
	//
	// The willChange/onChange events also allow us to handle the case where the user
	// types something then quickly switch a different note. In that case, bodyWillChangeId
	// is set, thus we know we should save the note, even though we won't receive the
	// onChange event.
	bodyWillChangeId: number
	bodyChangeId: number,

	saveActionQueue: AsyncActionQueue,

	// Note with markup_language = HTML have a block of CSS at the start, which is used
	// to preserve the style from the original (web-clipped) page. When sending the note
	// content to TinyMCE, we only send the actual HTML, without this CSS. The CSS is passed
	// via a file in pluginAssets. This is because TinyMCE would not render the style otherwise.
	// However, when we get back the HTML from TinyMCE, we need to reconstruct the original note.
	// Since the CSS used by TinyMCE has been lost (since it's in a temp CSS file), we keep that
	// original CSS here. It's used in formNoteToNote to rebuild the note body.
	// We can keep it here because we know TinyMCE will not modify it anyway.
	originalCss: string,
}

export enum ScrollOptionTypes {
	None = 0,
	Hash = 1,
	Percent = 2,
}

export interface ScrollOptions {
	type: ScrollOptionTypes,
	value: any,
}

export async function commandAttachFileToBody(body:string, filePaths:string[] = null, options:any = null) {
	options = {
		createFileURL: false,
		position: 0,
		...options,
	};

	if (!filePaths) {
		filePaths = bridge().showOpenDialog({
			properties: ['openFile', 'createDirectory', 'multiSelections'],
		});
		if (!filePaths || !filePaths.length) return null;
	}

	for (let i = 0; i < filePaths.length; i++) {
		const filePath = filePaths[i];
		try {
			reg.logger().info(`Attaching ${filePath}`);
			const newBody = await shim.attachFileToNoteBody(body, filePath, options.position, {
				createFileURL: options.createFileURL,
				resizeLargeImages: 'ask',
			});

			if (!newBody) {
				reg.logger().info('File attachment was cancelled');
				return null;
			}

			body = newBody;
			reg.logger().info('File was attached.');
		} catch (error) {
			reg.logger().error(error);
			bridge().showErrorMessageBox(error.message);
		}
	}

	return body;
}

export interface LocalSearch {
	query: string,
	selectedIndex: number,
	resultCount: number,
	searching: boolean,
	timestamp: number,
}

interface SearchMarkersOptions {
	searchTimestamp: number,
	selectedIndex: number,
	separateWordSearch: boolean,
}

interface SearchMarkers {
	keywords: any[],
	options: SearchMarkersOptions,
}

export function defaultSearchMarkers():SearchMarkers {
	return {
		keywords: [],
		options: {
			searchTimestamp: 0,
			selectedIndex: 0,
			separateWordSearch: false,
		},
	};
}

function localSearchDefaultState():LocalSearch {
	return {
		query: '',
		selectedIndex: 0,
		resultCount: 0,
		searching: false,
		timestamp: 0,
	};
}

export function useNoteSearchBar() {
	const [showLocalSearch, setShowLocalSearch] = useState(false);
	const [localSearch, setLocalSearch] = useState<LocalSearch>(localSearchDefaultState());

	const onChange = useCallback((query:string) => {
		setLocalSearch((prev:LocalSearch) => {
			return {
				query: query,
				selectedIndex: 0,
				timestamp: Date.now(),
				resultCount: prev.resultCount,
				searching: true,
			};
		});
	}, []);

	const noteSearchBarNextPrevious = useCallback((inc:number) => {
		setLocalSearch((prev:LocalSearch) => {
			const ls = Object.assign({}, prev);
			ls.selectedIndex += inc;
			ls.timestamp = Date.now();
			if (ls.selectedIndex < 0) ls.selectedIndex = ls.resultCount - 1;
			if (ls.selectedIndex >= ls.resultCount) ls.selectedIndex = 0;
			return ls;
		});
	}, []);

	const onNext = useCallback(() => {
		noteSearchBarNextPrevious(+1);
	}, [noteSearchBarNextPrevious]);

	const onPrevious = useCallback(() => {
		noteSearchBarNextPrevious(-1);
	}, [noteSearchBarNextPrevious]);

	const onClose = useCallback(() => {
		setShowLocalSearch(false);
		setLocalSearch(localSearchDefaultState());
	}, []);

	const setResultCount = useCallback((count:number) => {
		setLocalSearch((prev:LocalSearch) => {
			if (prev.resultCount === count && !prev.searching) return prev;

			return {
				...prev,
				resultCount: count,
				searching: false,
			};
		});
	}, []);

	const searchMarkers = useCallback(():SearchMarkers => {
		return {
			options: {
				selectedIndex: localSearch.selectedIndex,
				separateWordSearch: false,
				searchTimestamp: localSearch.timestamp,
			},
			keywords: [
				{
					type: 'text',
					value: localSearch.query,
					accuracy: 'partially',
				},
			],
		};
	}, [localSearch]);

	return { localSearch, onChange, onNext, onPrevious, onClose, setResultCount, showLocalSearch, setShowLocalSearch, searchMarkers };
}

export function useSearchMarkers(showLocalSearch:boolean, localSearchMarkerOptions:Function, searches:any[], selectedSearchId:string) {
	return useMemo(():SearchMarkers => {
		if (showLocalSearch) return localSearchMarkerOptions();

		const output = defaultSearchMarkers();

		const search = BaseModel.byId(searches, selectedSearchId);
		if (search) {
			const parsedQuery = SearchEngine.instance().parseQuery(search.query_pattern);
			output.keywords = SearchEngine.instance().allParsedQueryTerms(parsedQuery);
		}

		return output;
	}, [showLocalSearch, localSearchMarkerOptions, searches, selectedSearchId]);
}
