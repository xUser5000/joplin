import { useState, useEffect } from 'react';

export function cursorPositionToTextOffset(cursorPos:any, body:string) {
	if (!body) return 0;

	const noteLines = body.split('\n');

	let pos = 0;
	for (let i = 0; i < noteLines.length; i++) {
		if (i > 0) pos++; // Need to add the newline that's been removed in the split() call above

		if (i === cursorPos.row) {
			pos += cursorPos.column;
			break;
		} else {
			pos += noteLines[i].length;
		}
	}

	return pos;
}

export function currentTextOffset(editor:any, body:string) {
	return cursorPositionToTextOffset(editor.getCursorPosition(), body);
}

export function rangeToTextOffsets(range:any, body:string) {
	return {
		start: cursorPositionToTextOffset(range.start, body),
		end: cursorPositionToTextOffset(range.end, body),
	};
}

export function textOffsetSelection(selectionRange:any, body:string) {
	return selectionRange && body ? rangeToTextOffsets(selectionRange, body) : null;
}

export function selectedText(selectionRange:any, body:string) {
	const selection = textOffsetSelection(selectionRange, body);
	if (!selection || selection.start === selection.end) return '';

	return body.substr(selection.start, selection.end - selection.start);
}

export function useSelectionRange(editor:any) {
	const [selectionRange, setSelectionRange] = useState(null);

	useEffect(() => {
		if (!editor) return () => {};

		function updateSelection() {
			const ranges = editor.getSelection().getAllRanges();
			const firstRange = ranges && ranges.length ? ranges[0] : null;
			setSelectionRange(firstRange);

			// if (process.platform === 'linux') {
			// 	const textRange = this.textOffsetSelection();
			// 	if (textRange.start != textRange.end) {
			// 		clipboard.writeText(this.state.note.body.slice(
			// 			Math.min(textRange.start, textRange.end),
			// 			Math.max(textRange.end, textRange.start)), 'selection');
			// 	}
			// }
		}

		function onSelectionChange() {
			updateSelection();
		}

		function onFocus() {
			updateSelection();
		}

		editor.getSession().selection.on('changeSelection', onSelectionChange);
		editor.on('focus', onFocus);

		return () => {
			editor.getSession().selection.off('changeSelection', onSelectionChange);
			editor.off('focus', onFocus);
		};
	}, [editor]);

	return selectionRange;
}

export function textOffsetToCursorPosition(offset:number, body:string) {
	const lines = body.split('\n');
	let row = 0;
	let currentOffset = 0;
	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];
		if (currentOffset + line.length >= offset) {
			return {
				row: row,
				column: offset - currentOffset,
			};
		}

		row++;
		currentOffset += line.length + 1;
	}

	return null;
}

function lineAtRow(body:string, row:number) {
	if (!body) return '';
	const lines = body.split('\n');
	if (row < 0 || row >= lines.length) return '';
	return lines[row];
}

export function selectionRangeCurrentLine(selectionRange:any, body:string) {
	if (!selectionRange) return '';
	return lineAtRow(body, selectionRange.start.row);
}

export function selectionRangePreviousLine(selectionRange:any, body:string) {
	if (!selectionRange) return '';
	return lineAtRow(body, selectionRange.start.row - 1);
}

export function lineLeftSpaces(line:string) {
	let output = '';
	for (let i = 0; i < line.length; i++) {
		if ([' ', '\t'].indexOf(line[i]) >= 0) {
			output += line[i];
		} else {
			break;
		}
	}
	return output;
}
