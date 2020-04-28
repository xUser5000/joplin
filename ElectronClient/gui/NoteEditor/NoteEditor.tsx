import * as React from 'react';
import { useState, useEffect, useCallback, useRef } from 'react';

// eslint-disable-next-line no-unused-vars
import TinyMCE from './NoteBody/TinyMCE/TinyMCE';
import AceEditor  from './NoteBody/AceEditor/AceEditor';
import { connect } from 'react-redux';
import AsyncActionQueue from '../../lib/AsyncActionQueue';
import MultiNoteActions from '../MultiNoteActions';
import NoteToolbar from '../NoteToolbar/NoteToolbar';

// eslint-disable-next-line no-unused-vars
import { OnChangeEvent, EditorCommand } from '../utils/NoteText';
// eslint-disable-next-line no-unused-vars
import { FormNote, useNoteSearchBar, useSearchMarkers, ScrollOptions, ScrollOptionTypes } from './utils';
const { themeStyle, buildStyle } = require('../../theme.js');
const NoteSearchBar = require('../NoteSearchBar.min.js');
const { reg } = require('lib/registry.js');
const { time } = require('lib/time-utils.js');
const markupLanguageUtils = require('lib/markupLanguageUtils');
const HtmlToHtml = require('lib/joplin-renderer/HtmlToHtml');
const Setting = require('lib/models/Setting');
const BaseItem = require('lib/models/BaseItem');
const { MarkupToHtml } = require('lib/joplin-renderer');
const HtmlToMd = require('lib/HtmlToMd');
const { _ } = require('lib/locale');
const Note = require('lib/models/Note.js');
const BaseModel = require('lib/BaseModel.js');
const Resource = require('lib/models/Resource.js');
const { shim } = require('lib/shim');
const { bridge } = require('electron').remote.require('./bridge');
const { urlDecode } = require('lib/string-utils');
const urlUtils = require('lib/urlUtils');
const ResourceFetcher = require('lib/services/ResourceFetcher.js');
const DecryptionWorker = require('lib/services/DecryptionWorker.js');
const Menu = bridge().Menu;
const MenuItem = bridge().MenuItem;
const fs = require('fs-extra');
const { clipboard } = require('electron');
const { toSystemSlashes } = require('lib/path-utils');
const NoteListUtils = require('../utils/NoteListUtils');
const ExternalEditWatcher = require('lib/services/ExternalEditWatcher');
const eventManager = require('../../eventManager');
const NoteRevisionViewer = require('../NoteRevisionViewer.min');
const TagList = require('../TagList.min.js');

interface NoteTextProps {
	style: any;
	noteId: string;
	theme: number;
	dispatch: Function;
	selectedNoteIds: string[];
	notes: any[];
	watchedNoteFiles: string[];
	isProvisional: boolean;
	editorNoteStatuses: any;
	syncStarted: boolean;
	bodyEditor: string;
	windowCommand: any;
	folders: any[];
	notesParentType: string;
	historyNotes: any[];
	selectedNoteTags: any[];
	lastEditorScrollPercents: any;
	selectedNoteHash: string;
	searches: any[],
	selectedSearchId: string,
	customCss: string,
	noteVisiblePanes: string[],
}

const defaultNote = (): FormNote => {
	return {
		id: '',
		parent_id: '',
		title: '',
		body: '',
		is_todo: 0,
		markup_language: 1,
		bodyWillChangeId: 0,
		bodyChangeId: 0,
		saveActionQueue: null,
		originalCss: '',
		hasChanged: false,
		user_updated_time: 0,
	};
};

function styles_(props: NoteTextProps) {
	return buildStyle('NoteText', props.theme, (theme: any) => {
		return {
			root: {
				...props.style,
				boxSizing: 'border-box',
				paddingLeft: 10,
				paddingTop: 10,
				borderLeftWidth: 1,
				borderLeftColor: theme.dividerColor,
				borderLeftStyle: 'solid',
			},
			titleInput: {
				flex: 1,
				display: 'inline-block',
				paddingTop: 5,
				paddingBottom: 5,
				paddingLeft: 8,
				paddingRight: 8,
				marginRight: theme.paddingLeft,
				color: theme.textStyle.color,
				fontSize: theme.textStyle.fontSize * 1.25 * 1.5,
				backgroundColor: theme.backgroundColor,
				border: '1px solid',
				borderColor: theme.dividerColor,
			},
			warningBanner: {
				background: theme.warningBackgroundColor,
				fontFamily: theme.fontFamily,
				padding: 10,
				fontSize: theme.fontSize,
			},
			tinyMCE: {
				width: '100%',
				height: '100%',
			},
			toolbar: {
				marginTop: 4,
				marginBottom: 0,
			},
			titleDate: {
				...theme.textStyle,
				color: theme.colorFaded,
				paddingLeft: 10,
				paddingRight: 10,
			},
		};
	});
}

function usePrevious(value: any): any {
	const ref = useRef();
	useEffect(() => {
		ref.current = value;
	});
	return ref.current;
}

async function handleResourceDownloadMode(noteBody: string) {
	if (noteBody && Setting.value('sync.resourceDownloadMode') === 'auto') {
		const resourceIds = await Note.linkedResourceIds(noteBody);
		await ResourceFetcher.instance().markForDownload(resourceIds);
	}
}

async function htmlToMarkdown(html: string): Promise<string> {
	const htmlToMd = new HtmlToMd();
	let md = htmlToMd.parse(html, { preserveImageTagsWithSize: true });
	md = await Note.replaceResourceExternalToInternalLinks(md, { useAbsolutePaths: true });
	return md;
}

async function formNoteToNote(formNote: FormNote): Promise<any> {
	return {
		id: formNote.id,
		title: formNote.title,
		body: formNote.body,
	};
}

let resourceCache_: any = {};

function clearResourceCache() {
	resourceCache_ = {};
}

async function attachedResources(noteBody: string): Promise<any> {
	if (!noteBody) return {};
	const resourceIds = await Note.linkedItemIdsByType(BaseModel.TYPE_RESOURCE, noteBody);

	const output: any = {};
	for (let i = 0; i < resourceIds.length; i++) {
		const id = resourceIds[i];

		if (resourceCache_[id]) {
			output[id] = resourceCache_[id];
		} else {
			const resource = await Resource.load(id);
			const localState = await Resource.localState(resource);

			const o = {
				item: resource,
				localState: localState,
			};

			// eslint-disable-next-line require-atomic-updates
			resourceCache_[id] = o;
			output[id] = o;
		}
	}

	return output;
}

function installResourceHandling(refreshResourceHandler: Function) {
	ResourceFetcher.instance().on('downloadComplete', refreshResourceHandler);
	ResourceFetcher.instance().on('downloadStarted', refreshResourceHandler);
	DecryptionWorker.instance().on('resourceDecrypted', refreshResourceHandler);
}

function uninstallResourceHandling(refreshResourceHandler: Function) {
	ResourceFetcher.instance().off('downloadComplete', refreshResourceHandler);
	ResourceFetcher.instance().off('downloadStarted', refreshResourceHandler);
	DecryptionWorker.instance().off('resourceDecrypted', refreshResourceHandler);
}

async function attachResources() {
	const filePaths = bridge().showOpenDialog({
		properties: ['openFile', 'createDirectory', 'multiSelections'],
	});
	if (!filePaths || !filePaths.length) return [];

	const output = [];

	for (const filePath of filePaths) {
		try {
			const resource = await shim.createResourceFromPath(filePath);
			output.push({
				item: resource,
				markdownTag: Resource.markdownTag(resource),
			});
		} catch (error) {
			bridge().showErrorMessageBox(error.message);
		}
	}

	return output;
}

function NoteEditor(props: NoteTextProps) {
	const [formNote, setFormNote] = useState<FormNote>(defaultNote());
	const [showRevisions, setShowRevisions] = useState(false);
	const prevSyncStarted = usePrevious(props.syncStarted);
	const [isNewNote, setIsNewNote] = useState(false);
	const [titleHasBeenManuallyChanged, setTitleHasBeenManuallyChanged] = useState(false);
	const [scrollWhenReady, setScrollWhenReady] = useState<ScrollOptions>(null);
	const [resourceInfos, setResourceInfos] = useState<any>({});

	const editorRef = useRef<any>();
	const titleInputRef = useRef<any>();
	const formNoteRef = useRef<FormNote>();
	formNoteRef.current = { ...formNote };
	const isMountedRef = useRef(true);
	const noteSearchBarRef = useRef(null);

	const {
		localSearch,
		onChange: localSearch_change,
		onNext: localSearch_next,
		onPrevious: localSearch_previous,
		onClose: localSearch_close,
		setResultCount: setLocalSearchResultCount,
		showLocalSearch,
		setShowLocalSearch,
		searchMarkers: localSearchMarkerOptions,
	} = useNoteSearchBar();

	// If the note has been modified in another editor, wait for it to be saved
	// before loading it in this editor.
	const waitingToSaveNote = props.noteId && formNote.id !== props.noteId && props.editorNoteStatuses[props.noteId] === 'saving';

	const styles = styles_(props);

	async function initNoteState(n: any) {
		let originalCss = '';
		if (n.markup_language === MarkupToHtml.MARKUP_LANGUAGE_HTML) {
			const htmlToHtml = new HtmlToHtml();
			const splitted = htmlToHtml.splitHtml(n.body);
			originalCss = splitted.css;
		}

		setFormNote({
			id: n.id,
			title: n.title,
			body: n.body,
			is_todo: n.is_todo,
			parent_id: n.parent_id,
			bodyWillChangeId: 0,
			bodyChangeId: 0,
			markup_language: n.markup_language,
			saveActionQueue: new AsyncActionQueue(1000),
			originalCss: originalCss,
			hasChanged: false,
			user_updated_time: n.user_updated_time,
			encryption_applied: n.encryption_applied,
		});

		await handleResourceDownloadMode(n.body);
	}

	function scheduleSaveNote(formNote: FormNote) {
		if (!formNote.saveActionQueue) throw new Error('saveActionQueue is not set!!'); // Sanity check

		reg.logger().debug('Scheduling...', formNote);

		const makeAction = (formNote: FormNote) => {
			return async function() {
				const note = await formNoteToNote(formNote);
				reg.logger().debug('Saving note...', note);
				const savedNote:any = await Note.save(note);

				setFormNote((prev: FormNote) => {
					return { ...prev, user_updated_time: savedNote.user_updated_time };
				});

				props.dispatch({
					type: 'EDITOR_NOTE_STATUS_REMOVE',
					id: formNote.id,
				});
			};
		};

		formNote.saveActionQueue.push(makeAction(formNote));
	}

	async function saveNoteIfWillChange(formNote: FormNote) {
		if (!formNote.id || !formNote.bodyWillChangeId) return;

		const body = await editorRef.current.content();

		scheduleSaveNote({
			...formNote,
			body: body,
			bodyWillChangeId: 0,
			bodyChangeId: 0,
		});
	}

	async function saveNoteAndWait(formNote: FormNote) {
		saveNoteIfWillChange(formNote);
		return formNote.saveActionQueue.waitForAllDone();
	}

	const markupToHtml = useCallback(async (markupLanguage: number, md: string, options: any = null): Promise<any> => {
		options = {
			replaceResourceInternalToExternalLinks: false,
			...options,
		};

		md = md || '';

		const theme = themeStyle(props.theme);
		let resources = {};

		if (options.replaceResourceInternalToExternalLinks) {
			md = await Note.replaceResourceInternalToExternalLinks(md, { useAbsolutePaths: true });
		} else {
			resources = await attachedResources(md);
		}

		delete options.replaceResourceInternalToExternalLinks;

		const markupToHtml = markupLanguageUtils.newMarkupToHtml({
			resourceBaseUrl: `file://${Setting.value('resourceDir')}/`,
		});

		const result = await markupToHtml.render(markupLanguage, md, theme, Object.assign({}, {
			codeTheme: theme.codeThemeCss,
			userCss: props.customCss || '',
			resources: resources,
			postMessageSyntax: 'ipcProxySendToHost',
			splitted: true,
			externalAssetsOnly: true,
		}, options));

		return result;
	}, [props.theme, props.customCss, resourceInfos]);

	const allAssets = useCallback(async (markupLanguage: number): Promise<any[]> => {
		const theme = themeStyle(props.theme);

		const markupToHtml = markupLanguageUtils.newMarkupToHtml({
			resourceBaseUrl: `file://${Setting.value('resourceDir')}/`,
		});

		return markupToHtml.allAssets(markupLanguage, theme);
	}, [props.theme]);

	const joplinHtml = useCallback(async (type: string) => {
		if (type === 'checkbox') {
			const result = await markupToHtml(MarkupToHtml.MARKUP_LANGUAGE_MARKDOWN, '- [ ] xxxxxREMOVExxxxx', {
				bodyOnly: true,
				externalAssetsOnly: true,
			});
			const html = result.html
				.replace(/xxxxxREMOVExxxxx/m, ' ')
				.replace(/<ul.*?>/, '')
				.replace(/<\/ul>/, '');
			return { ...result, html: html };
		}

		throw new Error(`Invalid type:${type}`);
	}, [markupToHtml]);

	const handleProvisionalFlag = useCallback(() => {
		if (props.isProvisional) {
			props.dispatch({
				type: 'NOTE_PROVISIONAL_FLAG_CLEAR',
				id: formNote.id,
			});
		}
	}, [props.isProvisional, formNote.id]);

	const refreshResource = useCallback(async function(event) {
		const resourceIds = await Note.linkedResourceIds(formNote.body);
		if (resourceIds.indexOf(event.id) >= 0) {
			clearResourceCache();
			setResourceInfos(await attachedResources(formNote.body));
		}
	}, [formNote.body]);

	useEffect(() => {
		installResourceHandling(refreshResource);

		return () => {
			uninstallResourceHandling(refreshResource);
		};
	}, [refreshResource]);

	useEffect(() => {
		// This is not exactly a hack but a bit ugly. If the note was changed (willChangeId > 0) but not
		// yet saved, we need to save it now before the component is unmounted. However, we can't put
		// formNote in the dependency array or that effect will run every time the note changes. We only
		// want to run it once on unmount. So because of that we need to use that formNoteRef.
		return () => {
			isMountedRef.current = false;
			saveNoteIfWillChange(formNoteRef.current);
		};
	}, []);

	useEffect(() => {
		// Check that synchronisation has just finished - and
		// if the note has never been changed, we reload it.
		// If the note has already been changed, it's a conflict
		// that's already been handled by the synchronizer.

		if (!prevSyncStarted) return () => {};
		if (props.syncStarted) return () => {};
		if (formNote.hasChanged) return () => {};

		reg.logger().debug('Sync has finished and note has never been changed - reloading it');

		let cancelled = false;

		const loadNote = async () => {
			const n = await Note.load(props.noteId);
			if (cancelled) return;

			// Normally should not happened because if the note has been deleted via sync
			// it would not have been loaded in the editor (due to note selection changing
			// on delete)
			if (!n) {
				reg.logger().warn('Trying to reload note that has been deleted:', props.noteId);
				return;
			}

			await initNoteState(n);
		};

		loadNote();

		return () => {
			cancelled = true;
		};
	}, [prevSyncStarted, props.syncStarted, formNote]);

	useEffect(() => {
		if (!props.noteId) return () => {};

		if (formNote.id === props.noteId) return () => {};

		if (waitingToSaveNote) return () => {};

		let cancelled = false;

		reg.logger().debug('Loading existing note', props.noteId);

		saveNoteIfWillChange(formNote);

		function handleAutoFocus(noteIsTodo: boolean) {
			if (!props.isProvisional) return;

			const focusSettingName = noteIsTodo ? 'newTodoFocus' : 'newNoteFocus';

			requestAnimationFrame(() => {
				if (Setting.value(focusSettingName) === 'title') {
					if (titleInputRef.current) titleInputRef.current.focus();
				} else {
					if (editorRef.current) editorRef.current.execCommand({ name: 'focus' });
				}
			});
		}

		setShowRevisions(false);

		async function loadNote() {
			// if (formNote.saveActionQueue) await formNote.saveActionQueue.waitForAllDone();

			const n = await Note.load(props.noteId);
			if (cancelled) return;
			if (!n) throw new Error(`Cannot find note with ID: ${props.noteId}`);
			reg.logger().debug('Loaded note:', n);

			await initNoteState(n);

			setIsNewNote(props.isProvisional);
			setTitleHasBeenManuallyChanged(false);

			handleAutoFocus(!!n.is_todo);
		}

		loadNote();

		return () => {
			cancelled = true;
		};
	}, [props.noteId, props.isProvisional, formNote, waitingToSaveNote, props.lastEditorScrollPercents, props.selectedNoteHash]);

	const previousNoteId = usePrevious(formNote.id);

	useEffect(() => {
		if (formNote.id === previousNoteId) return;

		if (editorRef.current) {
			editorRef.current.resetScroll();
		}

		setScrollWhenReady({
			type: props.selectedNoteHash ? ScrollOptionTypes.Hash : ScrollOptionTypes.Percent,
			value: props.selectedNoteHash ? props.selectedNoteHash : props.lastEditorScrollPercents[props.noteId] || 0,
		});
	}, [formNote.id, previousNoteId]);

	const onFieldChange = useCallback((field: string, value: any, changeId = 0) => {
		if (!isMountedRef.current) {
			// When the component is unmounted, various actions can happen which can
			// trigger onChange events, for example the textarea might be cleared.
			// We need to ignore these events, otherwise the note is going to be saved
			// with an invalid body.
			reg.logger().debug('Skipping change event because the component is unmounted');
			return;
		}

		handleProvisionalFlag();

		const change = field === 'body' ? {
			body: value,
		} : {
			title: value,
		};

		const newNote = {
			...formNote,
			...change,
			bodyWillChangeId: 0,
			bodyChangeId: 0,
			hasChanged: true,
		};

		if (field === 'title') {
			setTitleHasBeenManuallyChanged(true);
		}

		if (isNewNote && !titleHasBeenManuallyChanged && field === 'body') {
			// TODO: Handle HTML/Markdown format
			newNote.title = Note.defaultTitle(value);
		}

		if (changeId !== null && field === 'body' && formNote.bodyWillChangeId !== changeId) {
			// Note was changed, but another note was loaded before save - skipping
			// The previously loaded note, that was modified, will be saved via saveNoteIfWillChange()
		} else {
			setFormNote(newNote);
			scheduleSaveNote(newNote);
		}
	}, [handleProvisionalFlag, formNote, isNewNote, titleHasBeenManuallyChanged]);

	useEffect(() => {
		const command = props.windowCommand;
		if (!command || !formNote) return;

		const editorCmd: EditorCommand = { name: '', value: { ...command.value } };
		let fn: Function = null;

		if (command.name === 'exportPdf') {
			// TODO
		} else if (command.name === 'print') {
			// TODO
		} else if (command.name === 'insertDateTime') {
			editorCmd.name = 'insertText',
			editorCmd.value = time.formatMsToLocal(new Date().getTime());
		} else if (command.name === 'commandStartExternalEditing') {
			// TODO
		} else if (command.name === 'commandStopExternalEditing') {
			// TODO
		} else if (command.name === 'showLocalSearch') {
			setShowLocalSearch(true);

			if (noteSearchBarRef.current) noteSearchBarRef.current.wrappedInstance.focus();

			// props.dispatch({
			// 	type: 'NOTE_VISIBLE_PANES_SET',
			// 	panes: ['editor', 'viewer'],
			// });
		} else if (command.name === 'textCode') {
			editorCmd.name = 'textCode';
		} else if (command.name === 'insertTemplate') {
			editorCmd.name = 'insertText',
			editorCmd.value = time.formatMsToLocal(new Date().getTime());
		} else if (command.name === 'textBold') {
			editorCmd.name = 'textBold';
		} else if (command.name === 'textItalic') {
			editorCmd.name = 'textItalic';
		} else if (command.name === 'textLink') {
			editorCmd.name = 'textLink';
		} else if (command.name === 'attachFile') {
			editorCmd.name = 'attachFile';
		}

		if (command.name === 'focusElement' && command.target === 'noteTitle') {
			fn = () => {
				if (!titleInputRef.current) return;
				titleInputRef.current.focus();
			};
		}

		if (command.name === 'focusElement' && command.target === 'noteBody') {
			editorCmd.name = 'focus';
		}

		if (!editorCmd.name && !fn) return;

		props.dispatch({
			type: 'WINDOW_COMMAND',
			name: null,
		});

		requestAnimationFrame(() => {
			if (fn) {
				fn();
			} else {
				if (!editorRef.current.execCommand) {
					reg.logger().warn('Received command, but editor cannot execute commands', editorCmd);
				} else {
					editorRef.current.execCommand(editorCmd);
				}
			}
		});
	}, [props.windowCommand, props.dispatch, formNote]);

	const onDrop = useCallback(async event => {
		const dt = event.dataTransfer;
		const createFileURL = event.altKey;

		if (dt.types.indexOf('text/x-jop-note-ids') >= 0) {
			const noteIds = JSON.parse(dt.getData('text/x-jop-note-ids'));
			const noteMarkdownTags = [];
			for (let i = 0; i < noteIds.length; i++) {
				const note = await Note.load(noteIds[i]);
				noteMarkdownTags.push(Note.markdownTag(note));
			}

			editorRef.current.execCommand({
				name: 'dropItems',
				value: {
					type: 'notes',
					markdownTags: noteMarkdownTags,
				},
			});

			return;
		}

		const files = dt.files;
		if (files && files.length) {
			const paths = [];
			for (let i = 0; i < files.length; i++) {
				const file = files[i];
				if (!file.path) continue;
				paths.push(file.path);
			}

			editorRef.current.execCommand({
				name: 'dropItems',
				value: {
					type: 'files',
					paths: paths,
					createFileURL: createFileURL,
				},
			});
		}
	}, []);

	const onBodyChange = useCallback((event: OnChangeEvent) => onFieldChange('body', event.content, event.changeId), [onFieldChange]);

	const onTitleChange = useCallback((event: any) => onFieldChange('title', event.target.value), [onFieldChange]);

	const onTitleKeydown = useCallback((event:any) => {
		const keyCode = event.keyCode;

		if (keyCode === 9) {
			// TAB
			event.preventDefault();

			if (event.shiftKey) {
				props.dispatch({
					type: 'WINDOW_COMMAND',
					name: 'focusElement',
					target: 'noteList',
				});
			} else {
				props.dispatch({
					type: 'WINDOW_COMMAND',
					name: 'focusElement',
					target: 'noteBody',
				});
			}
		}
	}, [props.dispatch]);

	const onBodyWillChange = useCallback((event: any) => {
		handleProvisionalFlag();

		setFormNote(prev => {
			return {
				...prev,
				bodyWillChangeId: event.changeId,
				hasChanged: true,
			};
		});

		props.dispatch({
			type: 'EDITOR_NOTE_STATUS_SET',
			id: formNote.id,
			status: 'saving',
		});
	}, [formNote, handleProvisionalFlag]);

	const onMessage = useCallback(async (event: any) => {
		const msg = event.channel ? event.channel : '';
		const args = event.args;
		const arg0 = args && args.length >= 1 ? args[0] : null;

		if (msg !== 'percentScroll') console.info(`Got ipc-message: ${msg}`, args);

		if (msg.indexOf('error:') === 0) {
			const s = msg.split(':');
			s.splice(0, 1);
			reg.logger().error(s.join(':'));
		} else if (msg === 'noteRenderComplete') {
			if (scrollWhenReady) {
				const options = { ...scrollWhenReady };
				setScrollWhenReady(null);
				editorRef.current.scrollTo(options);
			}
		} else if (msg === 'setMarkerCount') {
			setLocalSearchResultCount(arg0);
		} else if (msg.indexOf('markForDownload:') === 0) {
			const s = msg.split(':');
			if (s.length < 2) throw new Error(`Invalid message: ${msg}`);
			ResourceFetcher.instance().markForDownload(s[1]);
		} else if (msg === 'contextMenu') {
			const itemType = arg0 && arg0.type;

			const menu = new Menu();

			if (itemType === 'image' || itemType === 'resource') {
				const resource = await Resource.load(arg0.resourceId);
				const resourcePath = Resource.fullPath(resource);

				menu.append(
					new MenuItem({
						label: _('Open...'),
						click: async () => {
							const ok = bridge().openExternal(`file://${resourcePath}`);
							if (!ok) bridge().showErrorMessageBox(_('This file could not be opened: %s', resourcePath));
						},
					})
				);

				menu.append(
					new MenuItem({
						label: _('Save as...'),
						click: async () => {
							const filePath = bridge().showSaveDialog({
								defaultPath: resource.filename ? resource.filename : resource.title,
							});
							if (!filePath) return;
							await fs.copy(resourcePath, filePath);
						},
					})
				);

				menu.append(
					new MenuItem({
						label: _('Copy path to clipboard'),
						click: async () => {
							clipboard.writeText(toSystemSlashes(resourcePath));
						},
					})
				);
			} else if (itemType === 'text') {
				menu.append(
					new MenuItem({
						label: _('Copy'),
						click: async () => {
							clipboard.writeText(arg0.textToCopy);
						},
					})
				);
			} else if (itemType === 'link') {
				menu.append(
					new MenuItem({
						label: _('Copy Link Address'),
						click: async () => {
							clipboard.writeText(arg0.textToCopy);
						},
					})
				);
			} else {
				reg.logger().error(`Unhandled item type: ${itemType}`);
				return;
			}

			menu.popup(bridge().window());
		} else if (msg.indexOf('joplin://') === 0) {
			const resourceUrlInfo = urlUtils.parseResourceUrl(msg);
			const itemId = resourceUrlInfo.itemId;
			const item = await BaseItem.loadItemById(itemId);

			if (!item) throw new Error(`No item with ID ${itemId}`);

			if (item.type_ === BaseModel.TYPE_RESOURCE) {
				const localState = await Resource.localState(item);
				if (localState.fetch_status !== Resource.FETCH_STATUS_DONE || !!item.encryption_blob_encrypted) {
					if (localState.fetch_status === Resource.FETCH_STATUS_ERROR) {
						bridge().showErrorMessageBox(`${_('There was an error downloading this attachment:')}\n\n${localState.fetch_error}`);
					} else {
						bridge().showErrorMessageBox(_('This attachment is not downloaded or not decrypted yet'));
					}
					return;
				}
				const filePath = Resource.fullPath(item);
				bridge().openItem(filePath);
			} else if (item.type_ === BaseModel.TYPE_NOTE) {
				props.dispatch({
					type: 'FOLDER_AND_NOTE_SELECT',
					folderId: item.parent_id,
					noteId: item.id,
					hash: resourceUrlInfo.hash,
					// historyNoteAction: {
					// 	id: this.state.note.id,
					// 	parent_id: this.state.note.parent_id,
					// },
				});
			} else {
				throw new Error(`Unsupported item type: ${item.type_}`);
			}
		} else if (urlUtils.urlProtocol(msg)) {
			if (msg.indexOf('file://') === 0) {
				// When using the file:// protocol, openExternal doesn't work (does nothing) with URL-encoded paths
				require('electron').shell.openExternal(urlDecode(msg));
			} else {
				require('electron').shell.openExternal(msg);
			}
		} else if (msg.indexOf('#') === 0) {
			// This is an internal anchor, which is handled by the WebView so skip this case
		} else {
			bridge().showErrorMessageBox(_('Unsupported link or message: %s', msg));
		}
	}, [props.dispatch, setLocalSearchResultCount, scrollWhenReady]);

	const introductionPostLinkClick = useCallback(() => {
		bridge().openExternal('https://www.patreon.com/posts/34246624');
	}, []);

	const externalEditWatcher_noteChange = useCallback((event) => {
		if (event.id === formNote.id) {
			const newFormNote = {
				...formNote,
				title: event.note.title,
				body: event.note.body,
			};

			setFormNote(newFormNote);
			editorRef.current.setContent(event.note.body);
		}
	}, [formNote]);

	const onNotePropertyChange = useCallback((event) => {
		setFormNote(formNote => {
			if (formNote.id !== event.note.id) return formNote;

			const newFormNote: FormNote = { ...formNote };

			for (const key in event.note) {
				if (key === 'id') continue;
				(newFormNote as any)[key] = event.note[key];
			}

			return newFormNote;
		});
	}, []);

	useEffect(() => {
		eventManager.on('alarmChange', onNotePropertyChange);

		ExternalEditWatcher.instance().on('noteChange', externalEditWatcher_noteChange);

		return () => {
			eventManager.off('alarmChange', onNotePropertyChange);

			ExternalEditWatcher.instance().off('noteChange', externalEditWatcher_noteChange);
		};
	}, [externalEditWatcher_noteChange]);

	const noteToolbar_buttonClick = useCallback((event: any) => {
		const cases: any = {

			'startExternalEditing': async () => {
				await saveNoteAndWait(formNote);
				NoteListUtils.startExternalEditing(formNote.id);
			},

			'stopExternalEditing': () => {
				NoteListUtils.stopExternalEditing(formNote.id);
			},

			'setTags': async () => {
				await saveNoteAndWait(formNote);

				props.dispatch({
					type: 'WINDOW_COMMAND',
					name: 'setTags',
					noteIds: [formNote.id],
				});
			},

			'setAlarm': async () => {
				await saveNoteAndWait(formNote);

				props.dispatch({
					type: 'WINDOW_COMMAND',
					name: 'editAlarm',
					noteId: formNote.id,
				});
			},

			'showRevisions': () => {
				setShowRevisions(true);
			},
		};

		if (!cases[event.name]) throw new Error(`Unsupported event: ${event.name}`);

		cases[event.name]();
	}, [formNote]);

	const onScroll = useCallback((event: any) => {
		props.dispatch({
			type: 'EDITOR_SCROLL_PERCENT_SET',
			noteId: formNote.id,
			percent: event.percent,
		});
	}, [props.dispatch, formNote]);

	function renderNoNotes(rootStyle:any) {
		const emptyDivStyle = Object.assign(
			{
				backgroundColor: 'black',
				opacity: 0.1,
			},
			rootStyle
		);
		return <div style={emptyDivStyle}></div>;
	}

	function renderNoteToolbar() {
		const toolbarStyle = {
			// marginTop: 4,
			marginBottom: 0,
			flex: 1,
		};

		return <NoteToolbar
			theme={props.theme}
			note={formNote}
			dispatch={props.dispatch}
			style={toolbarStyle}
			watchedNoteFiles={props.watchedNoteFiles}
			onButtonClick={noteToolbar_buttonClick}
		/>;
	}

	const searchMarkers = useSearchMarkers(showLocalSearch, localSearchMarkerOptions, props.searches, props.selectedSearchId);

	const editorProps = {
		ref: editorRef,
		contentKey: formNote.id,
		style: styles.tinyMCE,
		onChange: onBodyChange,
		onWillChange: onBodyWillChange,
		onMessage: onMessage,
		content: formNote.body,
		resourceInfos: resourceInfos,
		contentMarkupLanguage: formNote.markup_language,
		htmlToMarkdown: htmlToMarkdown,
		markupToHtml: markupToHtml,
		allAssets: allAssets,
		attachResources: attachResources,
		disabled: waitingToSaveNote,
		joplinHtml: joplinHtml,
		theme: props.theme,
		dispatch: props.dispatch,
		noteToolbar: renderNoteToolbar(),
		onScroll: onScroll,
		searchMarkers: searchMarkers,
		visiblePanes: props.noteVisiblePanes || ['editor', 'viewer'],
		keyboardMode: Setting.value('editor.keyboardMode'),
	};

	let editor = null;

	if (props.bodyEditor === 'TinyMCE') {
		editor = <TinyMCE {...editorProps}/>;
	// } else if (props.bodyEditor === 'PlainEditor') {
	// 	editor = <PlainEditor {...editorProps}/>;
	// 	textEditorUtils_ = plainEditorUtils;
	} else if (props.bodyEditor === 'AceEditor') {
		editor = <AceEditor {...editorProps}/>;
	} else {
		throw new Error(`Invalid editor: ${props.bodyEditor}`);
	}

	const wysiwygBanner = props.bodyEditor !== 'TinyMCE' ? null : (
		<div style={styles.warningBanner}>
			This is an experimental WYSIWYG editor for evaluation only. Please do not use with important notes as you may lose some data! See the <a style={styles.urlColor} onClick={introductionPostLinkClick} href="#">introduction post</a> for more information.
		</div>
	);

	const noteRevisionViewer_onBack = useCallback(() => {
		setShowRevisions(false);
	}, []);

	const tagStyle = {
		// marginBottom: 10,
		height: 30,
	};

	const tagList = props.selectedNoteTags.length ? <TagList style={tagStyle} items={props.selectedNoteTags} /> : null;

	if (showRevisions) {
		const theme = themeStyle(props.theme);

		const revStyle = {
			...props.style,
			display: 'inline-flex',
			padding: theme.margin,
			verticalAlign: 'top',
			boxSizing: 'border-box',

		};

		return (
			<div style={revStyle}>
				<NoteRevisionViewer customCss={props.customCss} noteId={formNote.id} onBack={noteRevisionViewer_onBack} />
			</div>
		);
	}

	if (props.selectedNoteIds.length > 1) {
		return <MultiNoteActions
			theme={props.theme}
			selectedNoteIds={props.selectedNoteIds}
			notes={props.notes}
			dispatch={props.dispatch}
			watchedNoteFiles={props.watchedNoteFiles}
			style={props.style}
		/>;
	}

	const titleBarDate = <span style={styles.titleDate}>{time.formatMsToLocal(formNote.user_updated_time)}</span>;

	function renderSearchBar() {
		if (!showLocalSearch) return false;

		const theme = themeStyle(props.theme);

		return (
			<NoteSearchBar
				ref={noteSearchBarRef}
				style={{
					display: 'flex',
					height: 35,
					borderTop: `1px solid ${theme.dividerColor}`,
				}}
				query={localSearch.query}
				searching={localSearch.searching}
				resultCount={localSearch.resultCount}
				selectedIndex={localSearch.selectedIndex}
				onChange={localSearch_change}
				onNext={localSearch_next}
				onPrevious={localSearch_previous}
				onClose={localSearch_close}
			/>
		);
	}

	if (formNote.encryption_applied) {
		return renderNoNotes(styles.root);
	}

	return (
		<div style={styles.root} onDrop={onDrop}>
			<div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
				{wysiwygBanner}
				{tagList}
				<div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
					<input
						type="text"
						ref={titleInputRef}
						disabled={waitingToSaveNote}
						placeholder={props.isProvisional ? _('Creating new %s...', formNote.is_todo ? _('to-do') : _('note')) : ''}
						style={styles.titleInput}
						onChange={onTitleChange}
						onKeyDown={onTitleKeydown}
						value={formNote.title}
					/>
					{titleBarDate}
				</div>
				<div style={{ display: 'flex', flex: 1 }}>
					{editor}
				</div>
				<div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
					{renderSearchBar()}
				</div>
			</div>
		</div>
	);
}

export {
	NoteEditor as NoteEditorComponent,
};

const mapStateToProps = (state: any) => {
	const noteId = state.selectedNoteIds.length === 1 ? state.selectedNoteIds[0] : null;

	return {
		noteId: noteId,
		notes: state.notes,
		folders: state.folders,
		selectedNoteIds: state.selectedNoteIds,
		isProvisional: state.provisionalNoteIds.includes(noteId),
		editorNoteStatuses: state.editorNoteStatuses,
		syncStarted: state.syncStarted,
		theme: state.settings.theme,
		watchedNoteFiles: state.watchedNoteFiles,
		windowCommand: state.windowCommand,
		notesParentType: state.notesParentType,
		historyNotes: state.historyNotes,
		selectedNoteTags: state.selectedNoteTags,
		lastEditorScrollPercents: state.lastEditorScrollPercents,
		selectedNoteHash: state.selectedNoteHash,
		searches: state.searches,
		selectedSearchId: state.selectedSearchId,
		customCss: state.customCss,
		noteVisiblePanes: state.noteVisiblePanes,
	};
};

export default connect(mapStateToProps)(NoteEditor);
