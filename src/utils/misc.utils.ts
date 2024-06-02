import { Collection } from "discord.js";


export function toCollection<K, V>(property: string | number, list: V[]) {
	return new Collection<K, V>(list.map(item => [(item as any)[property] as K, item]));
}

export function toChoices(coll: ({ [key: string | number]: any }) | any[]) {
	return Object.values(coll).map((value) => ({ name: value, value }));
}

export function size<T>(items: T[] | Collection<any, T>): number {
	return ((items instanceof Collection) ? items?.size : items?.length) ?? 0;
}

export function map<T, S>(items: T[] | Collection<any, T>, fn: (queue: T) => S): S[] {
	return (items instanceof Collection) ? items.map(fn) : items.map(fn);
}

export function find<T>(items: T[] | Collection<any, T>, fn: (queue: T) => boolean): T {
	return (items instanceof Collection) ? items.find(fn) : items.find(fn);
}