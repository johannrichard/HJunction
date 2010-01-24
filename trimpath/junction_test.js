function testJunctionUtil() {
    assertEquals("2 times 3 plus 5 is 11", 11, 2*3 + 5);
    
	var stmt, rs, rs1, rs2, records;
    assertNotNull(TrimPath);
    assertNotNull(TrimPath.junctionUtil);

    var ju = TrimPath.junctionUtil;

    var x = 123;
    assertEquals(ju.safeEval('x = 234'), 234);
    assertEquals('safeEval scope 123', x, 123);
    assertEquals(ju.safeEval('x'), 234);

    assertEquals(ju.upperFirst('X'), 'X');
    assertEquals(ju.upperFirst('x'), 'X');
    assertEquals(ju.upperFirst('xxx'), 'Xxx');

    assertEquals(ju.leftZeroPad('xxx', 4), '0xxx');
    assertEquals(ju.leftZeroPad('', 4), '0000');
    assertEquals(ju.leftZeroPad('12', 4), '0012');
    assertEquals(ju.leftZeroPad('123456', 4), '123456');

    assertEquals(ju.trim(''), '');
    assertEquals(ju.trim('X'), 'X');
    assertEquals(ju.trim('  x  '), 'x');
}

function testDates() {
    var ju = TrimPath.junctionUtil;

    assertEquals(ju.parseDateString('foo'), null);

    var ds = '2007-01-02 03:04:05Z';
    var d = ju.parseDateString(ds);
    assertEquals(ds, ju.toSQLDateString(d));

    var ds2 = '2007/01/02 03:04:05Z';
    var d = ju.parseDateString(ds2);
    assertEquals(ds, ju.toSQLDateString(d));

    var ds2 = '2007/01/02 03:04:05 UTC';
    var d = ju.parseDateString(ds2);
    assertEquals(ds, ju.toSQLDateString(d));
}

function testSetMapTreeValue() {
    var ju = TrimPath.junctionUtil;

    var m = {};

    ju.setMapTreeValue(m, 'refund', 100);
    assertEquals(m.refund, 100);

    ju.setMapTreeValue(m, 'order[customer][name]', 'Tom');
    assertEquals(m.order.customer.name, 'Tom');

    ju.setMapTreeValue(m, 'order[customer][points]', 1000);
    assertEquals(m.order.customer.points, 1000);
}

function testSyncAllowedForTable() {
    var junction     = TrimPath.junction;
    var junctionUtil = TrimPath.junctionUtil;

    var db = junction.env.db = junction.env.createMemoryDb();

    var stepMap = {
        '0001_aaa' : { 
          up: function() {
            createStandardTable('A1', 
              column('a11', 'varchar(100)'),
              column('a12', 'varchar(4000)')
            );
            createTable('A2', 
              column('a21', 'varchar(100)'),
              column('a22', 'varchar(4000)')
            );
          },
          down: function() {
            dropTable('A1');
            dropTable('A2');
          }
        }
    }

    junction.dbMigrate(db, stepMap, null);
    assertEquals(db.getVersion(), 1);
    assertEquals(junctionUtil.getMapKeys(db.getSchema()).length, 2);

    assertTrue(junctionUtil.syncAllowedForTable('A1', db.getSchema()));
    assertFalse(junctionUtil.syncAllowedForTable('A2', db.getSchema()));

    junction.dbMigrate(db, stepMap, 0);
    assertEquals(db.getVersion(), 0);
    assertEquals(junctionUtil.getMapKeys(db.getSchema()).length, 0);
}

function testMigrate() {
    var junction     = TrimPath.junction;
    var junctionUtil = TrimPath.junctionUtil;

    assertNotNull(junction);
    assertNotNull(junction.env);
    assertNotNull(junctionUtil);

    var db = junction.env.db = junction.env.createMemoryDb();
    assertNotNull('junction.env.db', junction.env.db);

    var ident = db.getIdent();
    assertNotNull(ident);

    assertEquals(db.getIdent(), ident);
    assertEquals(db.getVersion(), 0);
    assertEquals(junctionUtil.getMapKeys(db.getSchema()).length, 0);

    var stepMap = {
        '0001_aaa' : { 
          up: function() {
            createStandardTable('A1', 
              column('a11', 'varchar(100)'),
              column('a12', 'varchar(4000)')
            );
            createStandardTable('A2', 
              column('a21', 'varchar(100)'),
              column('a22', 'varchar(4000)')
            );
          },
          down: function() {
            dropTable('A1');
            dropTable('A2');
          }
        }
    }

    junction.dbMigrate(db, stepMap, null);
    assertEquals(db.getIdent(), ident);
    assertEquals(db.getVersion(), 1);
    assertEquals(junctionUtil.getMapKeys(db.getSchema()).length, 2);

    var checkATables = function() {
        assertNotNull(db.getSchema()['A1']);
        assertNotNull(db.getSchema()['A1']['a11']);
        assertNotNull(db.getSchema()['A1']['a12']);
        assertUndefined(db.getSchema()['A1']['a13']);
        assertNotNull(db.getSchema()['A2']);
        assertNotNull(db.getSchema()['A2']['a21']);
        assertNotNull(db.getSchema()['A2']['a22']);
        assertUndefined(db.getSchema()['A2']['a23']);
        assertUndefined(db.getSchema()['A3']);
    }
    var checkNoATables = function() {
        assertUndefined(db.getSchema()['A1']);
        assertUndefined(db.getSchema()['A2']);
        assertUndefined(db.getSchema()['A3']);
    }

    checkATables();

    junction.dbMigrate(db, stepMap, 1);
    assertEquals(db.getIdent(), ident);
    assertEquals(db.getVersion(), 1);
    assertEquals(junctionUtil.getMapKeys(db.getSchema()).length, 2);
    checkATables();

    junction.dbMigrate(db, stepMap, null);
    assertEquals(db.getIdent(), ident);
    assertEquals(db.getVersion(), 1);
    assertEquals(junctionUtil.getMapKeys(db.getSchema()).length, 2);
    checkATables();

    junction.dbMigrate(db, stepMap, 0);
    assertEquals(db.getIdent(), ident);
    assertEquals(db.getVersion(), 0);
    assertEquals(junctionUtil.getMapKeys(db.getSchema()).length, 0);
    checkNoATables();

    stepMap['0002_bbb'] = {
          up: function() {
            createStandardTable('B1', 
              column('b11', 'varchar(100)'),
              column('b12', 'varchar(4000)')
            );
            createStandardTable('B2', 
              column('b21', 'varchar(100)'),
              column('b22', 'varchar(4000)')
            );
          },
          down: function() {
            dropTable('B1');
            dropTable('B2');
          }
    }

    junction.dbMigrate(db, stepMap, null);
    assertEquals(db.getIdent(), ident);
    assertEquals(db.getVersion(), 2);
    assertEquals(junctionUtil.getMapKeys(db.getSchema()).length, 4);

    var checkBTables = function() {
        assertNotNull(db.getSchema()['B1']);
        assertNotNull(db.getSchema()['B1']['b11']);
        assertNotNull(db.getSchema()['B1']['b12']);
        assertUndefined(db.getSchema()['B1']['b13']);
        assertNotNull(db.getSchema()['B2']);
        assertNotNull(db.getSchema()['B2']['b21']);
        assertNotNull(db.getSchema()['B2']['b22']);
        assertUndefined(db.getSchema()['B2']['b23']);
        assertUndefined(db.getSchema()['B3']);
    }
    var checkNoBTables = function() {
        assertUndefined(db.getSchema()['B1']);
        assertUndefined(db.getSchema()['B2']);
        assertUndefined(db.getSchema()['B3']);
    }

    checkATables();
    checkBTables();

    junction.dbMigrate(db, stepMap, 2);
    assertEquals(db.getIdent(), ident);
    assertEquals(db.getVersion(), 2);
    assertEquals(junctionUtil.getMapKeys(db.getSchema()).length, 4);

    checkATables();
    checkBTables();

    junction.dbMigrate(db, stepMap, 1);
    assertEquals(db.getIdent(), ident);
    assertEquals(db.getVersion(), 1);
    assertEquals(junctionUtil.getMapKeys(db.getSchema()).length, 2);

    checkATables();
    checkNoBTables();
    
    junction.dbMigrate(db, stepMap, null);
    assertEquals(db.getIdent(), ident);
    assertEquals(db.getVersion(), 2);
    assertEquals(junctionUtil.getMapKeys(db.getSchema()).length, 4);

    checkATables();
    checkBTables();

    junction.dbMigrate(db, stepMap, 0);
    assertEquals(db.getIdent(), ident);
    assertEquals(db.getVersion(), 0);
    assertEquals(junctionUtil.getMapKeys(db.getSchema()).length, 0);

    checkNoATables();
    checkNoBTables();

    junction.dbMigrate(db, stepMap, 1);
    assertEquals(db.getIdent(), ident);
    assertEquals(db.getVersion(), 1);
    assertEquals(junctionUtil.getMapKeys(db.getSchema()).length, 2);

    checkATables();
    checkNoBTables();

    stepMap['0003_ccc'] = {
          up: function() {
            createStandardTable('C1', 
              column('c11', 'varchar(100)'),
              column('c12', 'varchar(4000)')
            );
            createStandardTable('C2', 
              column('c21', 'varchar(100)'),
              column('c22', 'varchar(4000)')
            );
          },
          down: function() {
            dropTable('C1');
            dropTable('C2');
          }
    }

    junction.dbMigrate(db, stepMap, null);
    assertEquals(db.getIdent(), ident);
    assertEquals(db.getVersion(), 3);
    assertEquals(junctionUtil.getMapKeys(db.getSchema()).length, 6);

    var checkCTables = function() {
        assertNotNull(db.getSchema()['C1']);
        assertNotNull(db.getSchema()['C1']['c11']);
        assertNotNull(db.getSchema()['C1']['c12']);
        assertUndefined(db.getSchema()['C1']['c13']);
        assertNotNull(db.getSchema()['C2']);
        assertNotNull(db.getSchema()['C2']['c21']);
        assertNotNull(db.getSchema()['C2']['c22']);
        assertUndefined(db.getSchema()['C2']['c23']);
        assertUndefined(db.getSchema()['C3']);
    }
    var checkNoCTables = function() {
        assertUndefined(db.getSchema()['C1']);
        assertUndefined(db.getSchema()['C2']);
        assertUndefined(db.getSchema()['C3']);
    }

    checkATables();
    checkBTables();
    checkCTables();

    junction.dbMigrate(db, stepMap, 1);
    assertEquals(db.getIdent(), ident);
    assertEquals(db.getVersion(), 1);
    assertEquals(junctionUtil.getMapKeys(db.getSchema()).length, 2);

    checkATables();
    checkNoBTables();
    checkNoCTables();

    junction.dbMigrate(db, stepMap, 3);
    assertEquals(db.getIdent(), ident);
    assertEquals(db.getVersion(), 3);
    assertEquals(junctionUtil.getMapKeys(db.getSchema()).length, 6);

    checkATables();
    checkBTables();
    checkCTables();

    junction.dbMigrate(db, stepMap, 0);
    assertEquals(db.getIdent(), ident);
    assertEquals(db.getVersion(), 0);
    assertEquals(junctionUtil.getMapKeys(db.getSchema()).length, 0);
}

function testMemTransact() {
    var junction     = TrimPath.junction;
    var junctionUtil = TrimPath.junctionUtil;

    var db = junction.env.db = junction.env.createMemoryDb();

    var stepMap = {
        '0001_aaa' : { 
          up: function() {
            createStandardTable('A1', 
              column('s', 'varchar(100)')
            );
          },
          down: function() {
            dropTable('A1');
          }
        }
    }

    junction.dbMigrate(db, stepMap, null);
    assertEquals(db.getVersion(), 1);
    assertEquals(junctionUtil.getMapKeys(db.getSchema()).length, 1);

    db.transact(function() {
        db.saveRecord('A1', { id:1, y: 'one' });
        db.saveRecord('A1', { id:2, y: 'two' });
    });

    var rs = db.execute("SELECT A1.* FROM A1");
    assertEquals(rs.length, 2);

    try {
        db.transact(function() {
            var rs = db.execute("SELECT A1.* FROM A1");
            assertEquals(rs.length, 2);
        
            db.saveRecord('A1', { id:3, y: 'three' });
            db.saveRecord('A1', { id:4, y: 'four' });

            var rs = db.execute("SELECT A1.* FROM A1");
            assertEquals('read consistency', rs.length, 4);

            throw new Error('rollback testing');
        });
    } catch (swallow_e) {
        assertTrue('swallow exception', true);
    }

    var rs = db.execute("SELECT A1.* FROM A1");
    assertEquals('rollback inserts', rs.length, 2);

    junction.dbMigrate(db, stepMap, 0);
    assertEquals(db.getVersion(), 0);
    assertEquals(junctionUtil.getMapKeys(db.getSchema()).length, 0);
}

function deepToString(obj, prefix) {
  if (prefix == null)
      prefix = "";
  if (!(obj instanceof Object))
    return String(obj);

  var out = [], first = true;
  out.push("{ ");
  for (var k in obj) {
    if (first != true) {
      out.push(",\n");
      out.push(prefix);
    }
    out.push(k + ": " + deepToString(obj[k], prefix + "  "));
    first = false;
  }
  out.push(" }");
  return out.join("");
}

function debugDeep(rs) {
  debug(deepToString(rs));
}

////////////////////////////////////////////////

function testJunctionHelpers() {
    var ju = TrimPath.junctionUtil;

    assertNotNull(TrimPath.junctionHelpers);
    var h = TrimPath.junctionHelpers();
    assertNotNull(h);

    assertEquals(h.h('hello'), 'hello');    
    assertEquals(h.h('<he&llo>'), '&lt;he&amp;llo&gt;');
    assertEquals(h.escape('hello'), 'hello');    
    assertEquals(h.escape('<he&llo>'), '&lt;he&amp;llo&gt;');

    assertEquals(h.linkTo('hi', 'c', 'a'), 
                 '<a href="?controllerName=c&actionName=a">hi</a>');    
    assertEquals(h.linkTo('hi', 'c', 'a', 123), 
                 '<a href="?controllerName=c&actionName=a&objId=123">hi</a>');    
    assertEquals(h.linkTo('hi', 'c', 'a', null), 
                 '<a href="?controllerName=c&actionName=a">hi</a>');    

    assertEquals(h.linkTo('hi', { controllerName: 'c', actionName: 'a' }), 
                 '<a href="?controllerName=c&actionName=a">hi</a>');    
    assertEquals(h.linkTo('hi', { controllerName: 'c', actionName: 'a', objId: 123 }), 
                 '<a href="?controllerName=c&actionName=a&objId=123">hi</a>');    
    assertEquals(h.linkTo('hi', { controllerName: 'c', actionName: 'a', objId: null }), 
                 '<a href="?controllerName=c&actionName=a&objId=null">hi</a>');    

    assertEquals(h.linkTo('hi', { controller: 'c1', action: 'a' }), 
                 '<a href="?controllerName=c1&actionName=a">hi</a>');    
    assertEquals(h.linkTo('hi', { controller: 'c2', action: 'a', id: 123 }), 
                 '<a href="?controllerName=c2&actionName=a&objId=123">hi</a>');    
}

////////////////////////////////////////////////

var Model1 = function() {}

function testJunctionModelInit() {
    var undef; // undefined

    var ju = TrimPath.junctionUtil;

    assertNotNull(TrimPath.junction);
    assertNotNull(TrimPath.junction.modelInit);

    var modelInit = TrimPath.junction.modelInit;

    assertEquals(undef, Model1.find);
    assertEquals(undef, Model1.newInstance);

    modelInit('Model1');
    
    assertNotNull(Model1.find);
    assertNotNull(Model1.newInstance);

    assertNotNull(Model1.find);
    assertNotNull(Model1.findActive);
    assertNotNull(Model1.findAll);
    assertNotNull(Model1.findFirst);
    assertNotNull(Model1.findBySql);
    assertNotNull(Model1.newInstance);

    assertNotNull(Model1.tableName);
    assertNotNull(Model1.pluralName);
    assertNotNull(Model1.hasMany);
    assertNotNull(Model1.hasManyActive);
    assertNotNull(Model1.belongsTo);
    assertNotNull(Model1.belongsToActive);
    assertNotNull(Model1.validatesFormatOf);
    assertNotNull(Model1.validatesInclusionOf);
    assertNotNull(Model1.validatesPresenceOf);
}
