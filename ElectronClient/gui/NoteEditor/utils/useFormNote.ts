import { useState, useEffect } from 'react';
import { FormNote, defaultFormNote } from './types';
const { MarkupToHtml } = require('lib/joplin-renderer');
const HtmlToHtml = require('lib/joplin-renderer/HtmlToHtml');
import AsyncActionQueue from '../../../lib/AsyncActionQueue';
import { handleResourceDownloadMode } from './resourceHandling';
const usePrevious = require('lib/hooks/usePrevious').default;
const Note = require('lib/models/Note');
const Setting = require('lib/models/Setting');
const { reg } = require('lib/registry.js');

export interface OnLoadEvent {
	formNote: FormNote,
}

interface HookDependencies {
	syncStarted: boolean,
	noteId: string,
	isProvisional: boolean,
	titleInputRef: any,
	editorRef: any,
	onBeforeLoad(event:OnLoadEvent):void,
	onAfterLoad(event:OnLoadEvent):void,
}

export default function useFormNote(dependencies:HookDependencies) {
	const { syncStarted, noteId, isProvisional, titleInputRef, editorRef, onBeforeLoad, onAfterLoad } = dependencies;

	const [formNote, setFormNote] = useState<FormNote>(defaultFormNote());
	const [isNewNote, setIsNewNote] = useState(false);
	const prevSyncStarted = usePrevious(syncStarted);

	async function initNoteState(n: any) {
		let originalCss = '';
		if (n.markup_language === MarkupToHtml.MARKUP_LANGUAGE_HTML) {
			const htmlToHtml = new HtmlToHtml();
			const splitted = htmlToHtml.splitHtml(n.body);
			originalCss = splitted.css;
		}

		const newFormNote = {
			id: n.id,
			title: n.title,
			body: n.body,
			is_todo: n.is_todo,
			parent_id: n.parent_id,
			bodyWillChangeId: 0,
			bodyChangeId: 0,
			markup_language: n.markup_language,
			saveActionQueue: new AsyncActionQueue(300),
			originalCss: originalCss,
			hasChanged: false,
			user_updated_time: n.user_updated_time,
			encryption_applied: n.encryption_applied,
		};

		setFormNote(newFormNote);

		await handleResourceDownloadMode(n.body);

		return newFormNote;
	}

	useEffect(() => {
		// Check that synchronisation has just finished - and
		// if the note has never been changed, we reload it.
		// If the note has already been changed, it's a conflict
		// that's already been handled by the synchronizer.

		if (!prevSyncStarted) return () => {};
		if (syncStarted) return () => {};
		if (formNote.hasChanged) return () => {};

		reg.logger().debug('Sync has finished and note has never been changed - reloading it');

		let cancelled = false;

		const loadNote = async () => {
			const n = await Note.load(noteId);
			if (cancelled) return;

			// Normally should not happened because if the note has been deleted via sync
			// it would not have been loaded in the editor (due to note selection changing
			// on delete)
			if (!n) {
				reg.logger().warn('Trying to reload note that has been deleted:', noteId);
				return;
			}

			await initNoteState(n);
		};

		loadNote();

		return () => {
			cancelled = true;
		};
	}, [prevSyncStarted, syncStarted, formNote]);

	useEffect(() => {
		if (!noteId) return () => {};

		if (formNote.id === noteId) return () => {};

		let cancelled = false;

		reg.logger().debug('Loading existing note', noteId);

		function handleAutoFocus(noteIsTodo: boolean) {
			if (!isProvisional) return;

			const focusSettingName = noteIsTodo ? 'newTodoFocus' : 'newNoteFocus';

			requestAnimationFrame(() => {
				if (Setting.value(focusSettingName) === 'title') {
					if (titleInputRef.current) titleInputRef.current.focus();
				} else {
					if (editorRef.current) editorRef.current.execCommand({ name: 'focus' });
				}
			});
		}

		async function loadNote() {
			// if (formNote.saveActionQueue) await formNote.saveActionQueue.waitForAllDone();

			const n = await Note.load(noteId);
			if (cancelled) return;
			if (!n) throw new Error(`Cannot find note with ID: ${noteId}`);
			reg.logger().debug('Loaded note:', n);

			onBeforeLoad({ formNote });

			const newFormNote = await initNoteState(n);

			setIsNewNote(isProvisional);

			onAfterLoad({ formNote: newFormNote });

			handleAutoFocus(!!n.is_todo);
		}

		loadNote();

		return () => {
			cancelled = true;
		};
	}, [noteId, isProvisional, formNote]);

	return { isNewNote, formNote, setFormNote };
}
