function testTemplate1() {
    assertEquals("2 times 3 plus 5 is 11", 11, 2*3 + 5);
    
    assertNotNull(TrimPath);
    assertNotNull(TrimPath.parseTemplate);
    assertNotNull(TrimPath.parseTemplate_etc);        
    assertNotNull(String.prototype.process);
   
    var data = { a: 111, b: 222, c: 333, h: "hEllo23world", 
					blackHole: null, 
					htmlChars1: "1<2>3&4", 
					htmlChars2: "<2>3&",
					arr1: [10, 20, 30], arrEmpty: [],
					yes: true, no: false,
                    allLowerHello : "hello",
                    obj1 : {
                        a : 1,
                        b : 2,
                        c : 3
                    },
                    obj2 : {
                        a : { a1 : 11,
                              a2 : 12 },
                        b : { b1 : 21,
                              b2 : 22,
                              b3 : null,
                              b4 : {} },
                        c : { c1 : 31,
                              c2 : 32 },
                        d : {},
                        e : null
                    },
                    obj3 : {},
                    _MODIFIERS: {
                        capFirst : function(src) { return src[0].toUpperCase() + src.substring(1); }
                    } };
    var t, x;
    t = TrimPath.parseTemplate("hello");
    assertNotNull("hello1.t", t);
    assertEquals("hello1", t.process(data), "hello");
    
    t = TrimPath.parseTemplate("hello ${a}");
    debug("kk:" + t.sourceFunc);
    assertNotNull("hello2.t", t);
    assertEquals("hello2", t.process(data), "hello 111");

    assertEquals("String.process0", "hello".process(data), "hello");
    assertEquals("String.process1", "hello ${a}".process(data), "hello 111");
    assertEquals("String.process1", "hello ${a + b}".process(data), "hello 333");

	assertEquals("capitalize", "test ${h|capitalize} end".process(data), "test HELLO23WORLD end");
        
	////////////////////////

	t = TrimPath.parseTemplate("expect error: ${notThere|default:'foo'} end");
	debug(t);
	debug(t.source);
	debug(t.sourceFunc);
	x = t.process(data);
	debug(x);
	assert("notThere", x.indexOf("ERROR") > 0);
	
	try {  x = t.process(data, { throwExceptions: true })
		assert("should not be here due to exception", false);
	} catch (e) {
		assert("notThere2 - caught expected exception", true);
	}
	
	assertEquals("default test",  "test ${blackHole|default:'foo'} end".process(data), "test foo end");
	assertEquals("default chain", "test ${blackHole|default:'foo'|capitalize} end".process(data), "test FOO end");
	assertEquals("default chain", "test ${blackHole|default:'foo'|capitalize|eat} end".process(data), "test  end");
	
	x = "test ${htmlChars1|h} end".process(data);
	assertEquals("h test1", x, "test 1&lt;2&gt;3&amp;4 end");
	debug(x);
	x = "test ${htmlChars2|h} end".process(data);
	debug(x);
	assertEquals("h test2", x, "test &lt;2&gt;3&amp; end");
	
	////////////////////////
	
	t = TrimPath.parseTemplate("${a}{var a = 555}${a}");
	debug(t.sourceFunc);
	x = t.process(data);
	debug(x);
	assertEquals("var.shadow1", x, "111555");
    assertEquals("var.shadow2", data["a"], 555); // TODO: I expected a == 111!  The var seems to latch onto existing "context.a"
	x = "${b}{var wasNotThereBefore = 54321}${wasNotThereBefore}".process(data);
	debug(x);
	assertEquals("var.shadow3", x, "22254321");
    assertEquals("var.shadow4", data["wasNotThereBefore"], undefined); // This var does not latch onto context.
	var shadowWNTB;
	try { shadowWNTB = wasNotThereBefore; } catch (e) {};
	assertEquals("var.shadow5", shadowWNTB, undefined); // Check that no global was set.

	////////////////////////

	x = "hey{foo}{bar}baz".process(data);
	assertEquals("fake.1", x, "hey{foo}{bar}baz");

	////////////////////////

	t = TrimPath.parseTemplate("{macro hello(x)}1${x}+${x}2{/macro}${hello('abc')}${hello('xyz')}");
	debug(t.sourceFunc);
	x = t.process(data);
	debug(x);
	assertEquals("macro.1", x, "1abc+abc21xyz+xyz2");
	assertEquals("macro.2", data.hello, undefined); // hello wasn't put inadvertently into context.
	var uuu;
	try { uuu = hello; } catch (e) {};
	assertEquals("macro.3", uuu, undefined); // hello wasn't put into global outside scope.

	////////////////////////

	x = "{if yes == true}hello{else}bye{/if}".process(data);
	assertEquals("if.1", x, "hello");
	x = "{if no == true}hello{else}bye{/if}".process(data);
	assertEquals("if.2", x, "bye");
	x = "{if no == true}hello{/if}world".process(data);
	assertEquals("if.2", x, "world");

	////////////////////////

	x = "1{for h in arrEmpty}hi{forelse}weAreEmpty{/for}2".process(data);
	assertEquals("forelse.1", x, "1weAreEmpty2");

	x = "1{for h in arrEmpty}hi{/for}2".process(data);
	assertEquals("forelse.1", x, "12");

	t = TrimPath.parseTemplate("start {for x in arr1}${x}.0 {/for} end");
	debug(t.sourceFunc);
	x = t.process(data);
	debug(x);
	assertEquals("for test1", x, "start10.020.030.0 end");
	x = t.process(data, { keepWhitespace: true });
	debug(x);
	assertEquals("for test1.ws", x, "start 10.0 20.0 30.0  end");

    ////////////////////////

    x = "a${allLowerHello|capFirst}b".process(data);
    assertEquals("aHellob", x);

    x = true;
    try {
        "a${allLowerHello|thisModifierDoesNotExist}b".process(data, { throwExceptions: true });
        x = false; // We never reach here due to thrown exception, so x should be true.
    } catch (e) {
    }
    assertTrue("thisModifierDoesNotExist", x);
	
    x = false;
    try {
        debug("a${allLowerHello|thisModifierDoesNotExist}b".process(data));
        x = true; // We DO reach because we default to thrownExceptions of null == false.
    } catch (e) {
        x = false;
    }
    assertTrue("thisModifierDoesNotExist2", x);

	////////////////////////

    x = true;
    try {
        t = TrimPath.parseTemplate("unmatchedIfTag{if true}body"); 
        // Note that exception is thrown in parseTemplate, not process.
        x = false; // We never reach here due to thrown exception.
    } catch (e) {
    }
    assertTrue("unmatchedIfTag", x);

	////////////////////////
	t = TrimPath.parseTemplate("start\n{for x in arr1}\n${x}.0\n{/for}\nend");
	debug(t.sourceFunc);
	x = t.process(data);
	debug(x);
	assertEquals("for test2", x, "start\n10.0\n20.0\n30.0\nend");
	
	x = "start {for x in arr1}${x}.0 {/for} end".process(data);
	debug(x);
	assertEquals("for test.a1", x, "start10.020.030.0 end");
	
	x = "start\n{for x in arr1}\n${x}.0\n{/for}\nend".process(data);
	debug(x);
	assertEquals("for test.a2", x, "start\n10.0\n20.0\n30.0\nend");

    /////////////////////////

    try {
        "hello {if} not enough params to if {/if}".process(data);
        assertTrue("if params", false);
    } catch (e) {
        debug(e.message);
    }

    try {
        "hello {if true} unclosed if!!!".process(data);
        assertTrue("if not closed", false);
    } catch (e) {
        debug(e.message);
    }

    try {
        "hello {if true} unclosed if!!! {if false} foobar".process(data);
        assertTrue("if not closed.2", false);
    } catch (e) {
        debug(e.message);
    }

    try {
        "hello {/if} non-matching close tags {/if}".process(data);
        assertTrue("if close tag unexpected", false);
    } catch (e) {
        debug(e.message);
    }

    assertEquals("hello ${false || true}".process({}), "hello true");
    assertEquals("hello ${false || true |capitalize}".process({}), "hello TRUE");

    x = "a${%b%}b".process(data);
    assertEquals("a222b", x);

    x = "a${% {x:121, y:{y1:1, y2:2}}.y.y2 %}b".process(data);
    debug(x);
    assertEquals("a2b", x);

    x = "a${%{x:121,y:{y1:1,y2:2}}.y.y2%}b".process(data);
    debug(x);
    assertEquals("a2b", x);

    x = "a${true}b".process(data);
    debug(x);
    assertEquals("atrueb", x);

    x = "a${false}b".process(data);
    debug(x);
    assertEquals("afalseb", x);

    x = "a${defined('yes')}b".process(data);
    debug(x);
    assertEquals("atrueb", x);

    x = "a${defined('this_is_not_defined')}b".process(data);
    debug(x);
    assertEquals("afalseb", x);

    x = "a${true}b{cdata EOF}c${true}dEOFe${true}f".process(data);
    debug(x);
    assertEquals("atruebc${true}detruef", x);

    x = "a{if true}${true}b{cdata EOF}c{if}${true}{/if}dEOFe${true}{/if}f".process(data);
    debug(x);
    assertEquals("atruebc{if}${true}{/if}detruef", x);

    x = "a${true}b{cdata}c${true}dEOFe${true}f".process(data);
    debug(x);
    assertEquals("atrueb{cdata}ctruedEOFetruef", x);

    x = "a{for i in obj1}${i_index}:${i}.{forelse}hey{/for}b".process(data);
    debug(x);
    assertEquals("aa:1.b:2.c:3.b", x); // Might fail due to obj enumaration unpredictability.

    x = "a{for i in obj2}${i_index}:${i}.{forelse}hey{/for}b".process(data);
    debug(x);
    assertEquals("aa:[object Object].b:[object Object].c:[object Object].d:[object Object].e:.b", x); // Might fail due to obj enumaration unpredictability.

    x = "a{for i in obj2}${i_index}:${i}.{for j in obj2[i_index]}${j_index}:${j}.{forelse}boo{/for};{forelse}hey{/for}b".process(data);
    debug(x);
    assertEquals("aa:[object Object].a1:11.a2:12.;b:[object Object].b1:21.b2:22.b3:.b4:[object Object].;c:[object Object].c1:31.c2:32.;d:[object Object].boo;e:.boo;b", x);

    x = "a{for i in obj3}${i_index}:${i}.{forelse}hey{/for}b".process(data);
    debug(x);
    assertEquals("aheyb", x);

    x = "a{if no}no{elseif yes}yes{/if}b".process(data);
    debug(x);
    assertEquals("ayesb", x);

    x = "a{if no}no{elseif no}yes{/if}b".process(data);
    debug(x);
    assertEquals("ab", x);

    x = "a{if no}no{elseif no}yes{elseif yes}{if no}hey{elseif yes}foo{/if}{/if}b".process(data);
    debug(x);
    assertEquals("afoob", x);

    x = "a{eval}123{/eval}b".process(data);
    debug(x);
    assertEquals("ab", x);

    x = "a{eval FOO}123FOOb".process(data);
    debug(x);
    assertEquals("ab", x);

    globalStart = globalEnd = 123;
    assertEquals(globalEnd, 123);
    x = "a{eval}globalEnd++{/eval}b${globalEnd}".process(data);
    debug(x);
    assertEquals("ab124", x);
    assertEquals(globalEnd, 124);

    globalStart = globalEnd = 123;
    assertEquals(globalEnd, 123);
    x = "a{eval RXY}globalEnd++RXYb${globalEnd}".process(data);
    debug(x);
    assertEquals("ab124", x);
    assertEquals(globalEnd, 124);

    x = "a{minify}1\n2\n3{/minify}b".process(data);
    debug(x);
    assertEquals("a1 2 3b", x);  

    x = "a{minify QWERT}1\n2\n3QWERTb".process(data);
    debug(x);
    assertEquals("a1 2 3b", x);  

    x = "a{eval}var x = 1+2;{/eval}b".process(data);
    debug(x);
    assertEquals("ab", x);  

    x = "a{eval}var x = 1+2;return x{/eval}b".process(data);
    debug(x);
    assertEquals("a3b", x);
}
