import { useEffect } from 'react';
import { FormNote, EditorCommand } from './types';
const { time } = require('lib/time-utils.js');
const { reg } = require('lib/registry.js');

interface HookDependencies {
	windowCommand: any,
	formNote:FormNote,
	setShowLocalSearch:Function,
	dispatch:Function,
	noteSearchBarRef:any,
	editorRef:any,
	titleInputRef:any,
}

export default function useWindowCommandHandler(dependencies:HookDependencies) {
	const { windowCommand, dispatch, formNote, setShowLocalSearch, noteSearchBarRef, editorRef, titleInputRef } = dependencies;

	useEffect(() => {
		const command = windowCommand;
		if (!command || !formNote) return;

		const editorCmd: EditorCommand = { name: '', value: { ...command.value } };
		let fn: Function = null;

		if (command.name === 'insertDateTime') {
			editorCmd.name = 'insertText',
			editorCmd.value = time.formatMsToLocal(new Date().getTime());
		} else if (command.name === 'showLocalSearch') {
			setShowLocalSearch(true);
			if (noteSearchBarRef.current) noteSearchBarRef.current.wrappedInstance.focus();
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

		dispatch({
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
	}, [windowCommand, dispatch, formNote]);
}
