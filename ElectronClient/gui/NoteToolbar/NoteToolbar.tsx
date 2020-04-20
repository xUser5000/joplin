import * as React from 'react';

const { buildStyle } = require('../../theme.js');
const Toolbar = require('../Toolbar.min.js');
const Note = require('lib/models/Note');
const { time } = require('lib/time-utils.js');
const { _ } = require('lib/locale');

interface ButtonClickEvent {
	name: string,
}

interface NoteToolbarProps {
	theme: number,
	style: any,
	watchedNoteFiles: string[],
	note: any,
	dispatch: Function,
	onButtonClick(event:ButtonClickEvent):void,
}

function styles_(props:NoteToolbarProps) {
	return buildStyle('NoteToolbar', props.theme, (/* theme:any*/) => {
		return {
			root: {
				...props.style,

			},
		};
	});
}

function useToolbarItems(note:any, watchedNoteFiles:string[], dispatch:Function, onButtonClick:Function) {
	const toolbarItems = [];

	if (watchedNoteFiles.indexOf(note.id) >= 0) {
		toolbarItems.push({
			tooltip: _('Click to stop external editing'),
			title: _('Watching...'),
			iconName: 'fa-external-link',
			onClick: () => {
				onButtonClick({ name: 'stopExternalEditing' });
			},
		});
	} else {
		toolbarItems.push({
			tooltip: _('Edit in external editor'),
			iconName: 'fa-external-link',
			onClick: () => {
				onButtonClick({ name: 'startExternalEditing' });
			},
		});
	}

	toolbarItems.push({
		tooltip: _('Tags'),
		iconName: 'fa-tags',
		onClick: () => {
			onButtonClick({ name: 'setTags' });
		},
	});

	if (note.is_todo) {
		const item:any = {
			iconName: 'fa-clock-o',
			enabled: !note.todo_completed,
			onClick: () => {
				onButtonClick({ name: 'setAlarm' });
			},
		};
		if (Note.needAlarm(note)) {
			item.title = time.formatMsToLocal(note.todo_due);
		} else {
			item.tooltip = _('Set alarm');
		}
		toolbarItems.push(item);
	}

	toolbarItems.push({
		tooltip: _('Note properties'),
		iconName: 'fa-info-circle',
		onClick: () => {
			dispatch({
				type: 'WINDOW_COMMAND',
				name: 'commandNoteProperties',
				noteId: note.id,
				onRevisionLinkClick: () => {
					onButtonClick({ name: 'showRevisions' });
				},
			});
		},
	});

	return toolbarItems;
}

export default function NoteToolbar(props:NoteToolbarProps) {
	const styles = styles_(props);

	const toolbarItems = useToolbarItems(props.note, props.watchedNoteFiles, props.dispatch, props.onButtonClick);

	return (
		<Toolbar style={styles.root} items={toolbarItems} />
	);
}
