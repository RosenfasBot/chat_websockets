
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(window.document);
var app = (function () {
    'use strict';

    function noop() { }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function empty() {
        return text('');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function prevent_default(fn) {
        return function (event) {
            event.preventDefault();
            // @ts-ignore
            return fn.call(this, event);
        };
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_input_value(input, value) {
        input.value = value == null ? '' : value;
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        flushing = false;
        seen_callbacks.clear();
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }

    const globals = (typeof window !== 'undefined'
        ? window
        : typeof globalThis !== 'undefined'
            ? globalThis
            : global);
    function mount_component(component, target, anchor) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        // onMount happens before the initial afterUpdate
        add_render_callback(() => {
            const new_on_destroy = on_mount.map(run).filter(is_function);
            if (on_destroy) {
                on_destroy.push(...new_on_destroy);
            }
            else {
                // Edge case - component was destroyed immediately,
                // most likely as a result of a binding initialising
                run_all(new_on_destroy);
            }
            component.$$.on_mount = [];
        });
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const prop_values = options.props || {};
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : []),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, prop_values, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor);
            flush();
        }
        set_current_component(parent_component);
    }
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.30.1' }, detail)));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.wholeText === data)
            return;
        dispatch_dev('SvelteDOMSetData', { node: text, data });
        text.data = data;
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    /* src\App.svelte generated by Svelte v3.30.1 */

    const { console: console_1 } = globals;
    const file = "src\\App.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[13] = list[i];
    	child_ctx[15] = i;
    	return child_ctx;
    }

    // (67:1) {#if counter>0}
    function create_if_block(ctx) {
    	let each_1_anchor;
    	let each_value = /*messages*/ ctx[3];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			each_1_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert_dev(target, each_1_anchor, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*messages, to_users, from_users*/ 56) {
    				each_value = /*messages*/ ctx[3];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}
    		},
    		d: function destroy(detaching) {
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach_dev(each_1_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(67:1) {#if counter>0}",
    		ctx
    	});

    	return block;
    }

    // (68:2) {#each messages as message, i}
    function create_each_block(ctx) {
    	let p;
    	let t0;
    	let t1_value = /*from_users*/ ctx[5][/*i*/ ctx[15]] + "";
    	let t1;
    	let t2;
    	let t3_value = /*to_users*/ ctx[4][/*i*/ ctx[15]] + "";
    	let t3;
    	let t4;
    	let t5_value = /*message*/ ctx[13] + "";
    	let t5;
    	let t6;

    	const block = {
    		c: function create() {
    			p = element("p");
    			t0 = text("From(");
    			t1 = text(t1_value);
    			t2 = text(") to (");
    			t3 = text(t3_value);
    			t4 = text(") -----: ");
    			t5 = text(t5_value);
    			t6 = space();
    			add_location(p, file, 68, 3, 1796);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    			append_dev(p, t0);
    			append_dev(p, t1);
    			append_dev(p, t2);
    			append_dev(p, t3);
    			append_dev(p, t4);
    			append_dev(p, t5);
    			append_dev(p, t6);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*from_users*/ 32 && t1_value !== (t1_value = /*from_users*/ ctx[5][/*i*/ ctx[15]] + "")) set_data_dev(t1, t1_value);
    			if (dirty & /*to_users*/ 16 && t3_value !== (t3_value = /*to_users*/ ctx[4][/*i*/ ctx[15]] + "")) set_data_dev(t3, t3_value);
    			if (dirty & /*messages*/ 8 && t5_value !== (t5_value = /*message*/ ctx[13] + "")) set_data_dev(t5, t5_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(68:2) {#each messages as message, i}",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let main;
    	let h1;
    	let t0;
    	let t1;
    	let t2;
    	let t3;
    	let form;
    	let h2;
    	let t5;
    	let input;
    	let t6;
    	let button;
    	let t8;
    	let h3;
    	let t10;
    	let t11;
    	let div1;
    	let div0;
    	let t12;
    	let t13;
    	let div2;
    	let span;
    	let t14;
    	let t15;
    	let t16_value = (/*numUsers*/ ctx[2] > 1 ? "users" : "user") + "";
    	let t16;
    	let t17;
    	let mounted;
    	let dispose;
    	let if_block = /*counter*/ ctx[1] > 0 && create_if_block(ctx);

    	const block = {
    		c: function create() {
    			main = element("main");
    			h1 = element("h1");
    			t0 = text("Olá a todos ");
    			t1 = text(/*name*/ ctx[0]);
    			t2 = text("!");
    			t3 = space();
    			form = element("form");
    			h2 = element("h2");
    			h2.textContent = "Send message:";
    			t5 = space();
    			input = element("input");
    			t6 = space();
    			button = element("button");
    			button.textContent = "Send";
    			t8 = space();
    			h3 = element("h3");
    			h3.textContent = "Received Message:";
    			t10 = space();
    			if (if_block) if_block.c();
    			t11 = space();
    			div1 = element("div");
    			div0 = element("div");
    			t12 = text(/*counter*/ ctx[1]);
    			t13 = space();
    			div2 = element("div");
    			span = element("span");
    			t14 = text(/*numUsers*/ ctx[2]);
    			t15 = space();
    			t16 = text(t16_value);
    			t17 = text(" online");
    			attr_dev(h1, "class", "svelte-nwf14g");
    			add_location(h1, file, 57, 1, 1515);
    			add_location(h2, file, 60, 2, 1556);
    			attr_dev(input, "type", "text");
    			add_location(input, file, 61, 2, 1582);
    			attr_dev(button, "type", "submit");
    			add_location(button, file, 62, 2, 1628);
    			add_location(form, file, 59, 1, 1547);
    			add_location(h3, file, 65, 1, 1714);
    			attr_dev(div0, "class", "value svelte-nwf14g");
    			add_location(div0, file, 72, 2, 1904);
    			attr_dev(div1, "class", "buttons svelte-nwf14g");
    			add_location(div1, file, 71, 1, 1880);
    			attr_dev(span, "class", "users");
    			add_location(span, file, 75, 1, 1969);
    			attr_dev(div2, "class", "state svelte-nwf14g");
    			add_location(div2, file, 74, 1, 1948);
    			attr_dev(main, "class", "svelte-nwf14g");
    			add_location(main, file, 56, 0, 1507);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			append_dev(main, h1);
    			append_dev(h1, t0);
    			append_dev(h1, t1);
    			append_dev(h1, t2);
    			append_dev(main, t3);
    			append_dev(main, form);
    			append_dev(form, h2);
    			append_dev(form, t5);
    			append_dev(form, input);
    			set_input_value(input, /*inputText*/ ctx[6]);
    			append_dev(form, t6);
    			append_dev(form, button);
    			append_dev(main, t8);
    			append_dev(main, h3);
    			append_dev(main, t10);
    			if (if_block) if_block.m(main, null);
    			append_dev(main, t11);
    			append_dev(main, div1);
    			append_dev(div1, div0);
    			append_dev(div0, t12);
    			append_dev(main, t13);
    			append_dev(main, div2);
    			append_dev(div2, span);
    			append_dev(span, t14);
    			append_dev(span, t15);
    			append_dev(span, t16);
    			append_dev(div2, t17);

    			if (!mounted) {
    				dispose = [
    					listen_dev(input, "input", /*input_input_handler*/ ctx[8]),
    					listen_dev(button, "click", prevent_default(/*handleClick*/ ctx[7]), false, true, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*name*/ 1) set_data_dev(t1, /*name*/ ctx[0]);

    			if (dirty & /*inputText*/ 64 && input.value !== /*inputText*/ ctx[6]) {
    				set_input_value(input, /*inputText*/ ctx[6]);
    			}

    			if (/*counter*/ ctx[1] > 0) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block(ctx);
    					if_block.c();
    					if_block.m(main, t11);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}

    			if (dirty & /*counter*/ 2) set_data_dev(t12, /*counter*/ ctx[1]);
    			if (dirty & /*numUsers*/ 4) set_data_dev(t14, /*numUsers*/ ctx[2]);
    			if (dirty & /*numUsers*/ 4 && t16_value !== (t16_value = (/*numUsers*/ ctx[2] > 1 ? "users" : "user") + "")) set_data_dev(t16, t16_value);
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    			if (if_block) if_block.d();
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("App", slots, []);
    	let { name } = $$props;
    	let username = "";
    	let counter = 0;
    	let numUsers = 0;
    	let messages = [];
    	let to_users = [];
    	let from_users = [];
    	let myNamelist = [];
    	let inputText = "";
    	let myName = "";
    	const ws = new WebSocket("ws://localhost:6789");

    	ws.onopen = function () {
    		console.log("Websocket Client Connected");
    	};

    	ws.onmessage = function (e) {
    		let data = JSON.parse(e.data);
    		console.log("Received:" + e.data);

    		if (data.type == "message") {
    			$$invalidate(1, counter = counter + 1);
    			$$invalidate(3, messages = [...messages, data.message_text]);
    			$$invalidate(4, to_users = [...to_users, data.to_user_name]);
    			$$invalidate(5, from_users = [...from_users, data.from_user_name]);
    			$$invalidate(6, inputText = "");
    		} else if (data.type == "users") {
    			$$invalidate(2, numUsers = data.count);
    		} else {
    			console.error("unsupported event", data);
    		}
    	};

    	function handleClick() {
    		if (inputText.startsWith("/name ")) {
    			ws.send(JSON.stringify({
    				"chat_message": inputText.slice(6),
    				"to_user_name": "all",
    				"name_alter": "True",
    				"private": "False",
    				"normal": "False"
    			}));
    		} else if (inputText.startsWith("/to ")) {
    			var temp = inputText.split(" ");
    			var temp_number = temp[1].length;

    			ws.send(JSON.stringify({
    				"chat_message": inputText.slice(4 + temp_number),
    				"to_user_name": temp[1],
    				"name_alter": "False",
    				"private": "True",
    				"normal": "False"
    			}));
    		} else if (myName != null) {
    			ws.send(JSON.stringify({
    				"chat_message": inputText,
    				"to_user_name": "all",
    				"name_alter": "False",
    				"private": "False",
    				"normal": "True"
    			}));
    		} else {
    			console.error("unsupported event", data);
    		}
    	}

    	const writable_props = ["name"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console_1.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	function input_input_handler() {
    		inputText = this.value;
    		$$invalidate(6, inputText);
    	}

    	$$self.$$set = $$props => {
    		if ("name" in $$props) $$invalidate(0, name = $$props.name);
    	};

    	$$self.$capture_state = () => ({
    		name,
    		username,
    		counter,
    		numUsers,
    		messages,
    		to_users,
    		from_users,
    		myNamelist,
    		inputText,
    		myName,
    		ws,
    		handleClick
    	});

    	$$self.$inject_state = $$props => {
    		if ("name" in $$props) $$invalidate(0, name = $$props.name);
    		if ("username" in $$props) username = $$props.username;
    		if ("counter" in $$props) $$invalidate(1, counter = $$props.counter);
    		if ("numUsers" in $$props) $$invalidate(2, numUsers = $$props.numUsers);
    		if ("messages" in $$props) $$invalidate(3, messages = $$props.messages);
    		if ("to_users" in $$props) $$invalidate(4, to_users = $$props.to_users);
    		if ("from_users" in $$props) $$invalidate(5, from_users = $$props.from_users);
    		if ("myNamelist" in $$props) myNamelist = $$props.myNamelist;
    		if ("inputText" in $$props) $$invalidate(6, inputText = $$props.inputText);
    		if ("myName" in $$props) myName = $$props.myName;
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		name,
    		counter,
    		numUsers,
    		messages,
    		to_users,
    		from_users,
    		inputText,
    		handleClick,
    		input_input_handler
    	];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, { name: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*name*/ ctx[0] === undefined && !("name" in props)) {
    			console_1.warn("<App> was created without expected prop 'name'");
    		}
    	}

    	get name() {
    		throw new Error("<App>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set name(value) {
    		throw new Error("<App>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    const app = new App({
    	target: document.body,
    	props: {
    		name: 'world'
    	}
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
