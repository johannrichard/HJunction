function testQuery1() {
    assertEquals("2 times 3 plus 5 is 11", 11, 2*3 + 5);
    
	var stmt, rs, rs1, rs2, records;
    assertNotNull(TrimPath);
    assertNotNull(TrimPath.makeQueryLang);

    if (TrimPath.TEST != null) {
        assertEquals(TrimPath.TEST.cleanString("hello"), "'hello'");
        assertEquals(TrimPath.TEST.cleanString("he\\nllo"), "'he\\\\nllo'");
        assertEquals(TrimPath.TEST.cleanString("he'llo"), "'he\\'llo'");
        assertEquals(TrimPath.TEST.cleanString("he\\'llo"), "'he\\\\\\'llo'");
    } else
        debug("TrimPath.TEST is null");

	var columnDefs = {
		Invoice  : { id     : { type: "String" },
                     total  : { type: "Number" },	
    			     custId : { type: "String" } },
		Customer : { id          : {},
                     acctBalance : {} },
        Refund : { id     : {},
                   custId : {},
                   amount : {} },
        NotInTableData : { id     : {},
                   custId : {},
                   amount : {} },
        User : { id     : {},
                 name   : {} },
        Thing : { id          : {},
                  updated_by  : {},
                  created_by  : {} },
        Event : { id       : { type: "Number" },
                   date     : { type: "Date"},
                   invoice_id : {type: "Number"} }
	};

	var queryLang = TrimPath.makeQueryLang(columnDefs);
	with (queryLang) {
        var tableData = { 
            Invoice : [ { id: 1, total: 100, custId: 10 }, 
                        { id: 2, total: 200, custId: 10 }, 
                        { id: 3, total: 300, custId: 10 }, 
                        { id: 4, total: 400, custId: 20 } ],
            Customer : [ { id: 10, acctBalance: 1000 }, 
                         { id: 20, acctBalance: 2000 }, 
                         { id: 30, acctBalance: 3000 } ],
            Refund : [],
            User : [ { id: 1, name: 'Pete' }, 
                     { id: 2, name: 'Gina' } ],
            Thing : [ { id: 1, updated_by: 1, created_by: 2 }, 
                      { id: 2, updated_by: 1, created_by: 1 } ],
            Event : []            
        };

        stmt = SELECT(Invoice.ALL, FROM(Invoice));
        debug(stmt);
        assertEquals("SELECT Invoice.* FROM Invoice", stmt.toSql());
        rs = stmt.filter(tableData);
        debugDeep(rs);
        assertEquals(rs.length, 4); // all records.
        assertTrue(rs[0].id != null && rs[0].total != null && rs[0].custId != null && rs[0].acctBalance == null);

        stmt = parseSQL("SELECT Invoice.* FROM Invoice");
        debug(stmt);
        assertEquals("SELECT Invoice.* FROM Invoice", stmt.toSql());
        rs = stmt.filter(tableData);
        debugDeep(rs);
        assertEquals(rs.length, 4); // all records.
        assertTrue(rs[0].id != null && rs[0].total != null && rs[0].custId != null && rs[0].acctBalance == null);

        stmt = SELECT(Invoice.id, Invoice.total, FROM(Invoice));
        debug(stmt);
        assertEquals("SELECT Invoice.id, Invoice.total FROM Invoice", stmt.toSql());
        rs = stmt.filter(tableData);
        debugDeep(rs);
        assertEquals(rs.length, 4); // all records.
        assertTrue(rs[0].id != null && rs[0].total != null && rs[0].custId == null && rs[0].acctBalance == null);

        stmt = parseSQL("SELECT Invoice.id, Invoice.total FROM Invoice");
        debug(stmt);
        assertEquals("SELECT Invoice.id, Invoice.total FROM Invoice", stmt.toSql());
        rs = stmt.filter(tableData);
        debugDeep(rs);
        assertEquals(rs.length, 4); // all records.
        assertTrue(rs[0].id != null && rs[0].total != null && rs[0].custId == null && rs[0].acctBalance == null);

        stmt = SELECT(Invoice.id, Invoice.total, Customer.acctBalance, FROM(Invoice, Customer));
        debug(stmt);
        assertEquals("SELECT Invoice.id, Invoice.total, Customer.acctBalance FROM Invoice, Customer", stmt.toSql());
        rs = stmt.filter(tableData);
        debugDeep(rs);
        assertEquals(rs.length, 4 * 3); // cross product.
        assertTrue(rs[0].id != null && rs[0].total != null && rs[0].custId == null && rs[0].acctBalance != null);

        stmt = parseSQL("SELECT Invoice.id, Invoice.total, Customer.acctBalance FROM Invoice, Customer");
        debug(stmt);
        assertEquals("SELECT Invoice.id, Invoice.total, Customer.acctBalance FROM Invoice, Customer", stmt.toSql());
        rs = stmt.filter(tableData);
        debugDeep(rs);
        assertEquals(rs.length, 4 * 3); // cross product.
        assertTrue(rs[0].id != null && rs[0].total != null && rs[0].custId == null && rs[0].acctBalance != null);

        stmt = SELECT(Invoice.id, Invoice.total, Customer.acctBalance, FROM(Invoice, CROSS_JOIN(Customer)));
        debug(stmt);
        assertEquals("SELECT Invoice.id, Invoice.total, Customer.acctBalance FROM Invoice, Customer", stmt.toSql());
        rs = stmt.filter(tableData);
        debugDeep(rs);
        assertEquals(rs.length, 4 * 3); // cross product.

        stmt = SELECT(Invoice.ALL, Customer.ALL, FROM(Invoice, Customer));
        debug(stmt);
        assertEquals("SELECT Invoice.*, Customer.* FROM Invoice, Customer", stmt.toSql());
        rs = stmt.filter(tableData);
        debugDeep(rs);
        assertEquals(rs.length, 4 * 3); // cross product.
        assertTrue(rs[0].id != null && rs[0].total != null && rs[0].custId != null && rs[0].acctBalance != null);

        stmt = parseSQL("SELECT Invoice.*, Customer.* FROM Invoice, Customer");
        debug(stmt);
        assertEquals("SELECT Invoice.*, Customer.* FROM Invoice, Customer", stmt.toSql());
        rs = stmt.filter(tableData);
        debugDeep(rs);
        assertEquals(rs.length, 4 * 3); // cross product.
        assertTrue(rs[0].id != null && rs[0].total != null && rs[0].custId != null && rs[0].acctBalance != null);

        stmt = SELECT(MULTIPLY(NEGATE(DIVIDE(ADD(Invoice.total, 10, 20), 30, 40)), 50, 60), 
                      PAREN(SUBTRACT(Customer.acctBalance, 70)), FROM(Invoice, Customer));
        debug(stmt);
        assertEquals("SELECT (- (((Invoice.total) + (10) + (20)) / (30) / (40))) * (50) * (60), " + 
                            "((Customer.acctBalance) - (70)) FROM Invoice, Customer", stmt.toSql());
        stmt.prepareFilter();

        stmt = SELECT(Invoice.id, Invoice.total, FROM(Invoice), WHERE(LT(Invoice.total, 250)));
        debug(stmt);
        rs = stmt.filter(tableData);
        debugDeep(rs);
        assertEquals(rs.length, 2);

        stmt = parseSQL("SELECT Invoice.id, Invoice.total FROM Invoice WHERE Invoice.total < 250");
        debug(stmt);
        rs = stmt.filter(tableData);
        debugDeep(rs);
        assertEquals(rs.length, 2);

        stmt = SELECT(Invoice.id, Invoice.total, FROM(Invoice), WHERE(OR(LT(Invoice.total, 250),
                                                                         EQ(Invoice.custId, 20))));
        debug(stmt);
        rs = stmt.filter(tableData);
        debugDeep(rs);
        assertEquals(rs.length, 3);

        stmt = parseSQL("SELECT Invoice.id, Invoice.total FROM Invoice WHERE Invoice.total < 250 OR Invoice.custId = 20");
        debug(stmt);
        rs = stmt.filter(tableData);
        debugDeep(rs);
        assertEquals(rs.length, 3);

        stmt = SELECT(Refund.ALL, FROM(Refund));
        debug(stmt);
        rs = stmt.filter(tableData);
        debugDeep(rs);
        assertEquals(rs.length, 0); // Refund is empty.

        stmt = SELECT(Customer.ALL, Refund.ALL, FROM(Customer, Refund));
        debug(stmt);
        rs = stmt.filter(tableData);
        debugDeep(rs);
        assertEquals(rs.length, 0); // Cross product is 0 since Refund table is empty.

        stmt = SELECT(FROM(Invoice.AS("i")), i.ALL);
        debug(stmt);
        assertEquals("SELECT i.* FROM Invoice AS i", stmt.toSql());
        rs = stmt.filter(tableData);
        debugDeep(rs);
        assertEquals("Table alias", rs.length, 4);
        assertTrue(rs[0].id != null && rs[0].total != null && rs[0].custId != null && rs[0].acctBalance == null);

        stmt = parseSQL("SELECT i.* FROM Invoice AS i");
        debug(stmt);
        assertEquals("SELECT i.* FROM Invoice AS i", stmt.toSql());
        rs = stmt.filter(tableData);
        debugDeep(rs);
        assertEquals("Table alias", rs.length, 4);
        assertTrue(rs[0].id != null && rs[0].total != null && rs[0].custId != null && rs[0].acctBalance == null);

        stmt = SELECT(FROM(Invoice.AS("i")), i.id.AS("ID_NUM"));
        debug(stmt);
        assertEquals("SELECT i.id AS ID_NUM FROM Invoice AS i", stmt.toSql());
        rs = stmt.filter(tableData);
        debugDeep(rs);
        assertEquals(rs.length, 4); // Column Alias
        assertTrue(rs[0].ID_NUM != null);
        assertTrue(rs[0].id == null && rs[0].total == null && rs[0].custId == null && rs[0].acctBalance == null);

        stmt = parseSQL("SELECT i.id AS ID_NUM FROM Invoice AS i");
        debug(stmt);
        assertEquals("SELECT i.id AS ID_NUM FROM Invoice AS i", stmt.toSql());
        rs = stmt.filter(tableData);
        debugDeep(rs);
        assertEquals(rs.length, 4); // Column Alias
        assertTrue(rs[0].ID_NUM != null);
        assertTrue(rs[0].id == null && rs[0].total == null && rs[0].custId == null && rs[0].acctBalance == null);

        stmt = SELECT(FROM(Invoice, Invoice.AS("i2")), Invoice.ALL, i2.ALL);
        debug(stmt);
        assertEquals("SELECT Invoice.*, i2.* FROM Invoice, Invoice AS i2", stmt.toSql());
        rs = stmt.filter(tableData);
        debugDeep(rs);
        assertEquals(rs.length, 4*4); // Cross product of self join

        stmt = parseSQL("SELECT Invoice.*, i2.* FROM Invoice, Invoice AS i2");
        debug(stmt);
        assertEquals("SELECT Invoice.*, i2.* FROM Invoice, Invoice AS i2", stmt.toSql());
        rs = stmt.filter(tableData);
        debugDeep(rs);
        assertEquals(rs.length, 4*4); // Cross product of self join

        stmt = SELECT(ADD(Invoice.id, Invoice.total).AS("Foo"), FROM(Invoice));
        debug(stmt);
        assertEquals("SELECT (Invoice.id) + (Invoice.total) AS Foo FROM Invoice", stmt.toSql());
        rs = stmt.filter(tableData);
        debugDeep(rs);
        assertEquals(rs.length, 4); // Cross product of self join
        assertTrue(rs[0].Foo != null);
        assertTrue(rs[0].ID_NUM == null);
        assertTrue(rs[0].id == null && rs[0].total == null && rs[0].custId == null && rs[0].acctBalance == null);

        stmt = SELECT(Customer.id, Invoice.custId, Invoice.total, Customer.acctBalance,
					  FROM(Invoice, Customer),
					  WHERE(EQ(Invoice.custId, Customer.id)));
        debug(stmt);
        assertEquals("SELECT Customer.id, Invoice.custId, Invoice.total, Customer.acctBalance FROM Invoice, Customer WHERE (Invoice.custId) = (Customer.id)", stmt.toSql());
        rs = stmt.filter(tableData);
        debugDeep(rs);
        assertEquals(rs.length, 4); // Inner join in where clause

        stmt = SELECT(Customer.id, Invoice.custId, Invoice.total, Customer.acctBalance,
					  FROM(Invoice, Customer),
					  WHERE(AND(LT(Invoice.total, 250),
                                EQ(Invoice.custId, Customer.id))));
        debug(stmt);
        assertEquals("SELECT Customer.id, Invoice.custId, Invoice.total, Customer.acctBalance FROM Invoice, Customer " + 
                      "WHERE ((Invoice.total) < (250)) AND ((Invoice.custId) = (Customer.id))", stmt.toSql());
        rs = stmt.filter(tableData);
        debugDeep(rs);
        assertEquals(rs.length, 2); // Inner join in where clause with test

        stmt = parseSQL("SELECT Customer.id, Invoice.custId, Invoice.total, Customer.acctBalance FROM Invoice, Customer " + 
                        "WHERE Invoice.total < 250 AND Invoice.custId = Customer.id");
        debug(stmt);
        assertEquals("SELECT Customer.id, Invoice.custId, Invoice.total, Customer.acctBalance FROM Invoice, Customer " + 
                      "WHERE Invoice.total < 250 AND Invoice.custId = Customer.id", stmt.toSql());
        rs = stmt.filter(tableData);
        debugDeep(rs);
        assertEquals(rs.length, 2); // Inner join in where clause with test

        var injectionVal = "' OR 1=1 -- ha ha ";
        stmt = SELECT(Invoice.id, FROM(Invoice), WHERE(EQ(Invoice, injectionVal)));
        debug(stmt);
        assertEquals("SELECT Invoice.id FROM Invoice WHERE (Invoice) = ('\\' OR 1=1 -- ha ha ')", stmt.toSql());

        stmt = SELECT(Invoice.id, FROM(Invoice), ORDER_BY(Invoice.id));
        debug(stmt);
        assertEquals("SELECT Invoice.id FROM Invoice ORDER BY Invoice.id", stmt.toSql());
        rs = stmt.filter(tableData);
        debugDeep(rs);
        assertEquals(rs.length, 4); // all records.
        assertTrue(rs[0].id < rs[1].id);
        assertTrue(rs[1].id < rs[2].id);
        assertTrue(rs[2].id < rs[3].id);

        stmt = parseSQL("SELECT Invoice.id FROM Invoice ORDER BY Invoice.id");
        debug(stmt);
        assertEquals("SELECT Invoice.id FROM Invoice ORDER BY Invoice.id", stmt.toSql());
        rs = stmt.filter(tableData);
        debugDeep(rs);
        assertEquals(rs.length, 4); // all records.
        assertTrue(rs[0].id < rs[1].id);
        assertTrue(rs[1].id < rs[2].id);
        assertTrue(rs[2].id < rs[3].id);

        stmt = SELECT(Invoice.id, FROM(Invoice), ORDER_BY(Invoice.id.ASC));
        debug(stmt);
        assertEquals("SELECT Invoice.id FROM Invoice ORDER BY Invoice.id ASC", stmt.toSql());
        rs = stmt.filter(tableData);
        debugDeep(rs);
        assertEquals(rs.length, 4); // all records.
        assertTrue(rs[0].id < rs[1].id);
        assertTrue(rs[1].id < rs[2].id);
        assertTrue(rs[2].id < rs[3].id);

        stmt = parseSQL("SELECT Invoice.id FROM Invoice ORDER BY Invoice.id ASC");
        debug(stmt);
        assertEquals("SELECT Invoice.id FROM Invoice ORDER BY Invoice.id ASC", stmt.toSql());
        rs = stmt.filter(tableData);
        debugDeep(rs);
        assertEquals(rs.length, 4); // all records.
        assertTrue(rs[0].id < rs[1].id);
        assertTrue(rs[1].id < rs[2].id);
        assertTrue(rs[2].id < rs[3].id);

        stmt = SELECT(Invoice.id, FROM(Invoice), ORDER_BY(Invoice.id.DESC));
        debug(stmt);
        assertEquals("SELECT Invoice.id FROM Invoice ORDER BY Invoice.id DESC", stmt.toSql());
        rs = stmt.filter(tableData);
        debugDeep(rs);
        assertEquals(rs.length, 4); // all records.
        assertTrue(rs[0].id > rs[1].id);
        assertTrue(rs[1].id > rs[2].id);
        assertTrue(rs[2].id > rs[3].id);

        stmt = parseSQL("SELECT Invoice.id FROM Invoice ORDER BY Invoice.id DESC");
        debug(stmt);
        assertEquals("SELECT Invoice.id FROM Invoice ORDER BY Invoice.id DESC", stmt.toSql());
        rs = stmt.filter(tableData);
        debugDeep(rs);
        assertEquals(rs.length, 4); // all records.
        assertTrue(rs[0].id > rs[1].id);
        assertTrue(rs[1].id > rs[2].id);
        assertTrue(rs[2].id > rs[3].id);

        stmt = SELECT(Invoice.custId, Invoice.id, FROM(Invoice), ORDER_BY(Invoice.custId.DESC, Invoice.id));
        debug(stmt);
        assertEquals("SELECT Invoice.custId, Invoice.id FROM Invoice ORDER BY Invoice.custId DESC, Invoice.id", stmt.toSql());
        rs = stmt.filter(tableData);
        debugDeep(rs);
        assertEquals(rs.length, 4); // all records.
        assertTrue(rs[0].custId >= rs[1].custId);
        assertTrue(rs[1].custId >= rs[2].custId);
        assertTrue(rs[2].custId >= rs[3].custId);	

        stmt = parseSQL("SELECT Invoice.custId, Invoice.id FROM Invoice ORDER BY Invoice.custId DESC, Invoice.id");
        debug(stmt);
        assertEquals("SELECT Invoice.custId, Invoice.id FROM Invoice ORDER BY Invoice.custId DESC, Invoice.id", stmt.toSql());
        rs = stmt.filter(tableData);
        debugDeep(rs);
        assertEquals(rs.length, 4); // all records.
        assertTrue(rs[0].custId >= rs[1].custId);
        assertTrue(rs[1].custId >= rs[2].custId);
        assertTrue(rs[2].custId >= rs[3].custId);
        
        stmt = SELECT(Refund.ALL, FROM(Refund), LIMIT(100));
        debug(stmt);
        assertEquals("SELECT Refund.* FROM Refund LIMIT 100", stmt.toSql());
        rs = stmt.filter(tableData);
        debugDeep(rs);
        assertEquals(rs.length, 0); // Refund is empty.

        stmt = SELECT(Refund.ALL, FROM(Refund), LIMIT(5, 100));
        debug(stmt);
        assertEquals("SELECT Refund.* FROM Refund LIMIT 100 OFFSET 5", stmt.toSql());
        rs = stmt.filter(tableData);
        debugDeep(rs);
        assertEquals(rs.length, 0); // Refund is empty.

        stmt = SELECT(Invoice.ALL, FROM(Invoice), LIMIT(2));
        debug(stmt);
        assertEquals("SELECT Invoice.* FROM Invoice LIMIT 2", stmt.toSql());
        rs = stmt.filter(tableData);
        debugDeep(rs);
        assertEquals(rs.length, 2); // just 2 records.

        stmt = SELECT(Invoice.ALL, FROM(Invoice), LIMIT(50, 2));
        debug(stmt);
        assertEquals("SELECT Invoice.* FROM Invoice LIMIT 2 OFFSET 50", stmt.toSql());
        rs = stmt.filter(tableData);
        debugDeep(rs);
        assertEquals(rs.length, 0); // past the rs size.

        stmt = parseSQL("SELECT Invoice.* FROM Invoice LIMIT 50, 2");
        debug(stmt);
        assertEquals("SELECT Invoice.* FROM Invoice LIMIT 2 OFFSET 50", stmt.toSql());
        rs = stmt.filter(tableData);
        debugDeep(rs);
        assertEquals(rs.length, 0); // past the rs size.

        stmt = SELECT(Invoice.ALL, FROM(Invoice), LIMIT(3, 2));
        debug(stmt);
        assertEquals("SELECT Invoice.* FROM Invoice LIMIT 2 OFFSET 3", stmt.toSql());
        rs = stmt.filter(tableData);
        debugDeep(rs);
        assertEquals(rs.length, 1); // last record.

        stmt = SELECT(Invoice.total, 
                      SUM(Invoice.total).AS("SUM_total"), 
                      COUNT(Invoice.total).AS("COUNT_total"), 
                      AVG(Invoice.total).AS("AVG_total"), 
                      FROM(Invoice));
        debug(stmt);
        assertEquals("SELECT Invoice.total, " + 
                     "SUM (Invoice.total) AS SUM_total, " +
                     "COUNT (Invoice.total) AS COUNT_total, " +
                     "AVG (Invoice.total) AS AVG_total FROM Invoice", stmt.toSql());
        rs = stmt.filter(tableData);
        debugDeep(rs);
        assertEquals(rs.length, 4);
        for (var i = 0; i < rs.length; i++) {
            var row = rs[i];
            assertEquals(row.total, row.SUM_total);
            assertEquals(1, row.COUNT_total);
            assertEquals(row.total, row.AVG_total);
        }
        
        stmt = parseSQL("SELECT Invoice.total, " + 
                     "SUM (Invoice.total) AS SUM_total, " +
                     "COUNT (Invoice.total) AS COUNT_total, " +
                     "AVG (Invoice.total) AS AVG_total FROM Invoice");
        debug(stmt);
        assertEquals("SELECT Invoice.total, " + 
                     "SUM (Invoice.total) AS SUM_total, " +
                     "COUNT (Invoice.total) AS COUNT_total, " +
                     "AVG (Invoice.total) AS AVG_total FROM Invoice", stmt.toSql());
        rs = stmt.filter(tableData);
        debugDeep(rs);
        assertEquals(rs.length, 4);
        for (var i = 0; i < rs.length; i++) {
            var row = rs[i];
            assertEquals(row.total, row.SUM_total);
            assertEquals(1, row.COUNT_total);
            assertEquals(row.total, row.AVG_total);
        }

        stmt = SELECT(Invoice.total, 
                      SUM(Invoice.total).AS("SUM_total"), 
                      COUNT(Invoice.total).AS("COUNT_total"), 
                      AVG(Invoice.total).AS("AVG_total"), 
                      FROM(Invoice), GROUP_BY(Invoice.custId));
        debug(stmt);
        assertEquals("SELECT Invoice.total, " + 
                     "SUM (Invoice.total) AS SUM_total, " +
                     "COUNT (Invoice.total) AS COUNT_total, " +
                     "AVG (Invoice.total) AS AVG_total FROM Invoice GROUP BY Invoice.custId", stmt.toSql());
        rs = stmt.filter(tableData);
        debugDeep(rs);
        assertEquals(rs.length, 2);

        stmt = SELECT(Invoice.total, 
                      SUM(Invoice.total).AS("SUM_total"), 
                      FROM(Invoice), GROUP_BY(Invoice.custId), ORDER_BY(SUM_total.ASC));
        debug(stmt);
        assertEquals("SELECT Invoice.total, " + 
                     "SUM (Invoice.total) AS SUM_total " +
                     "FROM Invoice GROUP BY Invoice.custId ORDER BY SUM_total ASC", stmt.toSql());
        rs = stmt.filter(tableData);
        debugDeep(rs);
        assertEquals(rs.length, 2);
        assertTrue(rs[0].SUM_total < rs[1].SUM_total);

        // TODO: this test does not work correctly in IE7
        stmt = SELECT(Invoice.total.AS("TOT"), 
                      SUM(Invoice.total).AS("SUM_total"), 
                      FROM(Invoice), 
                      GROUP_BY(Invoice.custId), 
                      HAVING(LT(TOT, 150)),
                      ORDER_BY(SUM_total.ASC));
        debug(stmt);
        assertEquals("SELECT Invoice.total AS TOT, " + 
                     "SUM (Invoice.total) AS SUM_total " +
                     "FROM Invoice " +
                     "GROUP BY Invoice.custId HAVING (TOT) < (150) " +
                     "ORDER BY SUM_total ASC", stmt.toSql());
        rs = stmt.filter(tableData);
        debugDeep(rs);
        //assertEquals(rs.length, 1);
        //assertTrue(rs[0].TOT < 150);

        // TODO: this test does not work correctly in IE7
        stmt = parseSQL("SELECT Invoice.total AS TOT, " + 
                     "SUM (Invoice.total) AS SUM_total " +
                     "FROM Invoice " +
                     "GROUP BY Invoice.custId HAVING TOT < 150 " +
                     "ORDER BY SUM_total ASC");
        debug(stmt);
        assertEquals("SELECT Invoice.total AS TOT, " + 
                     "SUM (Invoice.total) AS SUM_total " +
                     "FROM Invoice " +
                     "GROUP BY Invoice.custId HAVING TOT < 150 " +
                     "ORDER BY SUM_total ASC", stmt.toSql());
        rs = stmt.filter(tableData);
        debugDeep(rs);
        //assertEquals(rs.length, 1);
        //assertTrue(rs[0].TOT < 150);

        stmt = SELECT(Invoice.total.AS("TOT"), 
                      SUM(Invoice.total).AS("SUM_total"), 
                      FROM(Invoice), 
                      GROUP_BY(Invoice.custId), 
                      HAVING(GT(SUM_total, 550)),
                      ORDER_BY(SUM_total.ASC));
        debug(stmt);
        assertEquals("SELECT Invoice.total AS TOT, " + 
                     "SUM (Invoice.total) AS SUM_total " +
                     "FROM Invoice " +
                     "GROUP BY Invoice.custId HAVING (SUM_total) > (550) " +
                     "ORDER BY SUM_total ASC", stmt.toSql());
        rs = stmt.filter(tableData);
        debugDeep(rs);
        assertEquals(rs.length, 1);
        assertTrue(rs[0].SUM_total > 550);

        stmt = SELECT(Invoice.total.AS("TOT"), 
                      SUM(Invoice.total).AS("SUM_total"), 
                      FROM(Invoice), 
                      GROUP_BY(Invoice.custId), 
                      HAVING(GT(SUM_total, 500000)),
                      ORDER_BY(SUM_total.DESC));
        debug(stmt);
        assertEquals("SELECT Invoice.total AS TOT, " + 
                     "SUM (Invoice.total) AS SUM_total " +
                     "FROM Invoice " +
                     "GROUP BY Invoice.custId HAVING (SUM_total) > (500000) " +
                     "ORDER BY SUM_total DESC", stmt.toSql());
        rs = stmt.filter(tableData);
        debugDeep(rs);
        assertEquals(rs.length, 0);

        stmt = SELECT(Customer.id, Invoice.total, FROM(Customer, INNER_JOIN(Invoice)));
        debug(stmt);
        assertEquals("SELECT Customer.id, Invoice.total FROM Customer INNER JOIN Invoice", stmt.toSql());
        rs = stmt.filter(tableData);
        debugDeep(rs);
        assertEquals(rs.length, 3 * 4);

        stmt = SELECT(Customer.id, Invoice.total, FROM(Customer, INNER_JOIN(Invoice).ON(EQ(Customer.id, Invoice.custId))));
        debug(stmt);
        assertEquals("SELECT Customer.id, Invoice.total " + 
                     "FROM Customer INNER JOIN Invoice ON (Customer.id) = (Invoice.custId)", 
                     stmt.toSql());
        rs = stmt.filter(tableData);
        debugDeep(rs);
        assertEquals(rs.length, 3 + 1);

        stmt = SELECT(FROM(Customer, INNER_JOIN(Invoice.AS("I")).ON(EQ(Customer.id, I.custId))), Customer.id, I.total);
        debug(stmt);
        assertEquals("SELECT Customer.id, I.total " + 
                     "FROM Customer INNER JOIN Invoice AS I ON (Customer.id) = (I.custId)", 
                     stmt.toSql());
        rs = stmt.filter(tableData);
        debugDeep(rs);
        assertEquals(rs.length, 3 + 1);

        stmt = SELECT(Invoice.id, Invoice.total, Refund.amount, FROM(Invoice, INNER_JOIN(Refund).USING("custId")));
        debug(stmt);
        assertEquals("SELECT Invoice.id, Invoice.total, Refund.amount " + 
                     "FROM Invoice INNER JOIN Refund USING (custId)", 
                     stmt.toSql());
        rs = stmt.filter(tableData);
        debugDeep(rs);
        assertEquals(rs.length, 0); // Refund is empty.

        stmt = SELECT(FROM(Invoice.AS("I"), INNER_JOIN(Refund.AS("R")).USING("custId")),
                      I.id, I.total, R.amount);
        debug(stmt);
        assertEquals("SELECT I.id, I.total, R.amount " + 
                     "FROM Invoice AS I INNER JOIN Refund AS R USING (custId)", 
                     stmt.toSql());
        rs = stmt.filter(tableData);
        debugDeep(rs);
        assertEquals(rs.length, 0); // Refund is empty.

        stmt = SELECT(Customer.id, Invoice.total, FROM(Customer, LEFT_OUTER_JOIN(Invoice).ON(EQ(Customer.id, Invoice.custId))));
        debug(stmt);
        assertEquals("SELECT Customer.id, Invoice.total " + 
                     "FROM Customer LEFT OUTER JOIN Invoice ON (Customer.id) = (Invoice.custId)", 
                     stmt.toSql());
        rs = stmt.filter(tableData);
        debugDeep(rs);
        assertEquals(rs.length, 3 + 1 + 1);

        // Testing positional ? arguments.
        stmt = parseSQL("SELECT Customer.id, Invoice.custId, Invoice.total, Customer.acctBalance FROM Invoice, Customer " + 
                        "WHERE Invoice.total < ? AND Invoice.custId = Customer.id", 250);
        debug(stmt);
        assertEquals("SELECT Customer.id, Invoice.custId, Invoice.total, Customer.acctBalance FROM Invoice, Customer " + 
                      "WHERE Invoice.total < 250 AND Invoice.custId = Customer.id", stmt.toSql());
        rs = stmt.filter(tableData);
        debugDeep(rs);
        assertEquals(rs.length, 2);

        stmt = parseSQL("SELECT Customer.id, Invoice.custId, Invoice.total, Customer.acctBalance FROM Invoice, Customer " + 
                        "WHERE Invoice.total < ? AND Invoice.custId = Customer.id", [ 250 ]);
        debug(stmt);
        assertEquals("SELECT Customer.id, Invoice.custId, Invoice.total, Customer.acctBalance FROM Invoice, Customer " + 
                      "WHERE Invoice.total < 250 AND Invoice.custId = Customer.id", stmt.toSql());
        rs = stmt.filter(tableData);
        debugDeep(rs);
        assertEquals(rs.length, 2);

        stmt = parseSQL("SELECT Invoice.id, Invoice.total FROM Invoice WHERE Invoice.total > ? AND Invoice.total < ?", [ 100, 400 ]);
        debug(stmt);
        assertEquals("SELECT Invoice.id, Invoice.total FROM Invoice WHERE Invoice.total > 100 AND Invoice.total < 400", stmt.toSql());
        rs = stmt.filter(tableData);
        debugDeep(rs);
        assertEquals(rs.length, 2);

        // updated to use WHERE_SQL clauses inside the ON clause
        stmt = parseSQL("SELECT Customer.id, Invoice.total FROM Customer LEFT OUTER JOIN Invoice ON Customer.id = Invoice.custId");
        debug(stmt);
        assertEquals("SELECT Customer.id, Invoice.total " + 
                     "FROM Customer LEFT OUTER JOIN Invoice ON WHERE Customer.id = Invoice.custId", 
                     stmt.toSql());
        rs = stmt.filter(tableData);
        debugDeep(rs);
        assertEquals(rs.length, 3 + 1 + 1);

        stmt = parseSQL("SELECT Customer.id, Invoice.total FROM Customer LEFT OUTER JOIN Invoice ON Customer.id = Invoice.custId WHERE Customer.acctBalance > 1000");
        debug(stmt);
        assertEquals("SELECT Customer.id, Invoice.total " + 
                     "FROM Customer LEFT OUTER JOIN Invoice ON WHERE Customer.id = Invoice.custId WHERE Customer.acctBalance > 1000", 
                     stmt.toSql());
        rs = stmt.filter(tableData);
        debugDeep(rs);
        assertEquals(rs.length, 2);

        stmt = parseSQL("SELECT NotInTableData.* FROM NotInTableData");
        debug(stmt);
        rs = stmt.filter(tableData);
        debugDeep(rs);
        assertEquals(rs.length, 0);
        
        // tests below added on 7-25-07 by Jupiter IT for new features added
        stmt = parseSQL("SELECT * FROM Invoice, Customer");
        debug(stmt);
        assertEquals("SELECT Invoice.*, Customer.* FROM Invoice, Customer", stmt.toSql());
        rs = stmt.filter(tableData);
        debugDeep(rs);
        assertEquals(rs.length, 4 * 3); // cross product.
        assertTrue(rs[0].id != null && rs[0].total != null && rs[0].custId != null && rs[0].acctBalance != null);
        
        stmt = parseSQL("SELECT * FROM Invoice");
        debug(stmt);
        assertEquals("SELECT Invoice.* FROM Invoice", stmt.toSql());
        rs = stmt.filter(tableData);
        debugDeep(rs);
        assertEquals(rs.length, 4); // all records.
        assertTrue(rs[0].id != null && rs[0].total != null && rs[0].custId != null && rs[0].acctBalance == null);
        
        stmt = parseSQL("SELECT * FROM Thing LEFT OUTER JOIN User ON Thing.created_by = User.id OR Thing.updated_by = User.id");
        debug(stmt);
        assertEquals("SELECT Thing.*, User.* FROM Thing " + 
                     "LEFT OUTER JOIN User ON WHERE Thing.created_by = User.id OR Thing.updated_by = User.id", 
                     stmt.toSql());
        rs = stmt.filter(tableData, null, {with_table: true});
        debugDeep(rs);
        assertEquals(rs.length, 3);
        assertTrue(rs[0]['Thing.created_by'] != null && rs[0]['Thing.id'] != null && rs[0]['Thing.updated_by'] != null && 
            rs[0]['User.id'] != null && rs[0]['User.name'] != null)

        stmt = parseSQL("INSERT INTO User (name, id) VALUES ('Sammy Sosa', '3')");
        debug(stmt);
        assertEquals("INSERT INTO User (name, id) VALUES ('Sammy Sosa',  '3')", 
                     stmt.toSql());
        rs = stmt.filter(tableData);
        assertEquals(tableData.User.length, 3);
        stmt = parseSQL("SELECT * FROM User WHERE User.id = 3");
        rs = stmt.filter(tableData);
        debugDeep(rs);
        assertEquals(rs.length, 1);
        assertEquals(rs[0].id, '3');
        assertEquals(rs[0].name, 'Sammy Sosa');

        stmt = parseSQL("UPDATE User SET name='Frank Thomas' WHERE User.id = '3'");
        debug(stmt);
        assertEquals("UPDATE FROM User name='Frank Thomas' WHERE User.id = '3'", 
                    stmt.toSql());
        rs = stmt.filter(tableData);
        stmt = parseSQL("SELECT * FROM User WHERE User.id = 3");
        rs = stmt.filter(tableData);
        debugDeep(rs);
        assertEquals(rs[0].name, 'Frank Thomas');
        
        stmt = parseSQL("SELECT * FROM User WHERE User.name LIKE 'P%'");
        rs = stmt.filter(tableData);
        debugDeep(rs);
        assertEquals(rs[0].name, 'Pete');

        stmt = parseSQL("DELETE User, Thing FROM Thing LEFT OUTER JOIN User ON Thing.created_by = User.id OR Thing.updated_by = User.id "+
                        "WHERE Thing.id = '1'");
        assertEquals("DELETE User, Thing FROM Thing LEFT OUTER JOIN User ON WHERE Thing.created_by = User.id OR Thing.updated_by = User.id "+
                     "WHERE Thing.id = '1'", stmt.toSql());
        debug(stmt);
        rs = stmt.filter(tableData);
        assertEquals(tableData.Thing.length, 1);
        assertEquals(tableData.User.length, 1);
        
        stmt = parseSQL("INSERT INTO Event (id, date, invoice_id) VALUES (1, '2003-1-1', 43)");
        debug(stmt);
        assertEquals("INSERT INTO Event (id, date, invoice_id) VALUES (1,  '2003-1-1',  43)", 
                     stmt.toSql());
        rs = stmt.filter(tableData);
        assertEquals(tableData.Event.length, 1);
        stmt = parseSQL("SELECT * FROM Event WHERE Event.id = 1");
        rs = stmt.filter(tableData);
        debugDeep(rs);
        assertEquals(rs.length, 1);
        assertEquals(rs[0].date, '2003-1-1');
        stmt = parseSQL("INSERT INTO Event (id, date, invoice_id) VALUES (2, '2005-1-1', 22)");
        rs = stmt.filter(tableData);
        stmt = parseSQL("INSERT INTO Event (id, date, invoice_id) VALUES (3, '2005-4-5', 21)");
        rs = stmt.filter(tableData);
        stmt = parseSQL("INSERT INTO Event (id, date, invoice_id) VALUES (4, '2005-4-25', -2)");
        rs = stmt.filter(tableData);
        assertEquals(tableData.Event.length, 4);
        stmt = parseSQL("SELECT * FROM Event ORDER BY Event.date ASC");
        rs = stmt.filter(tableData);
        assertEquals(rs[3].date, '2005-4-25');
        assertEquals(rs[1].date, '2005-1-1');
        stmt = parseSQL("SELECT * FROM Event ORDER BY Event.date DESC");
        rs = stmt.filter(tableData);
        assertEquals(rs[3].date, '2003-1-1');
        stmt = parseSQL("SELECT * FROM Event ORDER BY Event.invoice_id DESC");
        rs = stmt.filter(tableData);
        assertEquals(rs[0].invoice_id, 43);
        assertEquals(rs[1].invoice_id, 22);
        assertEquals(rs[3].invoice_id, -2);
        stmt = parseSQL("SELECT * FROM Event WHERE Event.date >= '2004-1-1'");
        rs = stmt.filter(tableData);
        assertEquals(rs.length, 3);
        stmt = parseSQL("SELECT * FROM Event WHERE Event.date >= '2004-1-1' AND Event.date <= '2005-4-5'");
        rs = stmt.filter(tableData);
        assertEquals(rs.length, 2);
        stmt = parseSQL("SELECT * FROM Event WHERE Event.invoice_id > 0");
        rs = stmt.filter(tableData);
        assertEquals(rs.length, 3);
        stmt = parseSQL("SELECT * FROM Event WHERE Event.invoice_id > 0 AND Event.invoice_id <= 25");
        rs = stmt.filter(tableData);
        assertEquals(rs.length, 2);

        // Test some NULL fields.
        //
        var tableDataWithNulls = { 
            Invoice : [ { id: 1, total: 100,  custId: 10 }, 
                        { id: 2, total: 200,  custId: null }, 
                        { id: 3, total: null, custId: null } ]
        };

        stmt = parseSQL("SELECT Invoice.* FROM Invoice WHERE Invoice.total IS NULL");
        rs = stmt.filter(tableDataWithNulls);
        assertEquals(1, rs.length);

        stmt = parseSQL("SELECT Invoice.* FROM Invoice WHERE Invoice.custId IS NULL");
        rs = stmt.filter(tableDataWithNulls);
        assertEquals(2, rs.length);

        stmt = parseSQL("SELECT Invoice.* FROM Invoice WHERE Invoice.total IS NULL OR Invoice.custId IS NULL");
        rs = stmt.filter(tableDataWithNulls);
        assertEquals(2, rs.length);

        stmt = parseSQL("SELECT Invoice.* FROM Invoice WHERE Invoice.total IS NOT NULL");
        rs = stmt.filter(tableDataWithNulls);
        assertEquals(2, rs.length);

        stmt = parseSQL("SELECT Invoice.* FROM Invoice WHERE Invoice.custId IS NOT NULL");
        rs = stmt.filter(tableDataWithNulls);
        assertEquals(1, rs.length);

        stmt = parseSQL("SELECT Invoice.* FROM Invoice WHERE Invoice.total IS NOT NULL AND Invoice.custId IS NULL");
        rs = stmt.filter(tableDataWithNulls);
        assertEquals(1, rs.length);
        assertEquals(2, rs[0].id);

        stmt = parseSQL("SELECT Invoice.* FROM Invoice WHERE Invoice.total IS NOT NULL AND Invoice.custId IS NOT NULL");
        rs = stmt.filter(tableDataWithNulls);
        assertEquals(1, rs.length);
        assertEquals(1, rs[0].id);

        stmt = parseSQL("SELECT * FROM Invoice WHERE Invoice.total IS NULL");
        rs = stmt.filter(tableDataWithNulls);
        assertEquals(1, rs.length);

        stmt = parseSQL("SELECT * FROM Invoice WHERE Invoice.custId IS NULL");
        rs = stmt.filter(tableDataWithNulls);
        assertEquals(2, rs.length);

        stmt = parseSQL("SELECT * FROM Invoice WHERE Invoice.total IS NULL OR Invoice.custId IS NULL");
        rs = stmt.filter(tableDataWithNulls);
        assertEquals(2, rs.length);

        stmt = parseSQL("SELECT * FROM Invoice WHERE Invoice.total IS NOT NULL");
        rs = stmt.filter(tableDataWithNulls);
        assertEquals(2, rs.length);

        stmt = parseSQL("SELECT * FROM Invoice WHERE Invoice.custId IS NOT NULL");
        rs = stmt.filter(tableDataWithNulls);
        assertEquals(1, rs.length);

        stmt = parseSQL("SELECT * FROM Invoice WHERE Invoice.total IS NOT NULL AND Invoice.custId IS NULL");
        rs = stmt.filter(tableDataWithNulls);
        assertEquals(1, rs.length);
        assertEquals(2, rs[0].id);

        stmt = parseSQL("SELECT * FROM Invoice WHERE Invoice.total IS NOT NULL AND Invoice.custId IS NOT NULL");
        rs = stmt.filter(tableDataWithNulls);
        assertEquals(1, rs.length);
        assertEquals(1, rs[0].id);

        stmt = parseSQL("SELECT * FROM Invoice ORDER BY Invoice.total ASC");
        rs = stmt.filter(tableDataWithNulls);
        assertEquals(3, rs.length);
        assertEquals(3, rs[0].id);
        assertEquals(1, rs[1].id);
        assertEquals(2, rs[2].id);

        stmt = parseSQL("SELECT * FROM Invoice ORDER BY Invoice.custId ASC, Invoice.id ASC");
        rs = stmt.filter(tableDataWithNulls);
        assertEquals(3, rs.length);
        assertEquals(2, rs[0].id);
        assertEquals(3, rs[1].id);
        assertEquals(1, rs[2].id);
    }
}

/*
        stmt = SELECT(Customer.id, Invoice.total, FROM(Customer, LEFT_OUTER_JOIN(Invoice).ON()));
        debug(stmt);
        assertEquals("SELECT Customer.id, Invoice.total FROM Invoice LEFT_OUTER_JOIN Customer", stmt.toSql());
        rs = stmt.filter(tableData);
        debugDeep(rs);
        assertEquals(rs.length, 3 + 1 + 1);

SELECT a, b, c FROM ...
SELECT tbl1.a, tbl2.a, tbl1.b FROM ...
SELECT tbl1.*, tbl2.a FROM ...
SELECT a AS value, b + c AS sum FROM ...

FROM table_reference AS alias
FROM table_reference alias
SELECT * FROM some_very_long_table_name s JOIN another_fairly_long_name a ON s.id = a.num;

FROM T1 CROSS JOIN T2 is equivalent to FROM T1, T2. It is also equivalent to FROM T1 INNER JOIN T2 ON TRUE
FROM T1 { [INNER] | { LEFT | RIGHT | FULL } [OUTER] } JOIN T2 ON boolean_expression
FROM T1 { [INNER] | { LEFT | RIGHT | FULL } [OUTER] } JOIN T2 USING ( join column list )
FROM T1 NATURAL { [INNER] | { LEFT | RIGHT | FULL } [OUTER] } JOIN T2

FROM a INNER JOIN b ON (a.id = b.id) WHERE b.val > 5

SELECT ... FROM fdt WHERE c1 > 5
SELECT ... FROM fdt WHERE c1 IN (1, 2, 3)
SELECT ... FROM fdt WHERE c1 IN (SELECT c1 FROM t2)
SELECT ... FROM fdt WHERE c1 IN (SELECT c3 FROM t2 WHERE c2 = fdt.c1 + 10)              <== !!!
SELECT ... FROM fdt WHERE c1 BETWEEN (SELECT c3 FROM t2 WHERE c2 = fdt.c1 + 10) AND 100 <== !!!
SELECT ... FROM fdt WHERE EXISTS (SELECT c1 FROM t2 WHERE c2 > fdt.c1)                  <== !!!

SELECT select_list
    FROM table_expression
    ORDER BY column1 [ASC | DESC] [, column2 [ASC | DESC] ...]
SELECT a, b FROM table1 ORDER BY a;
SELECT a + b AS sum, c FROM table1 ORDER BY sum;
SELECT a, sum(b) FROM table1 GROUP BY a ORDER BY 1;

SELECT ALL select_list ...
SELECT DISTINCT select_list ...
SELECT DISTINCT ON (expression [, expression ...]) select_list ...

SELECT * FROM weather LEFT OUTER JOIN cities ON (weather.city = cities.name);

SELECT W1.city, W1.temp_lo AS low, W1.temp_hi AS high,
    W2.city, W2.temp_lo AS low, W2.temp_hi AS high
    FROM weather W1, weather W2
    WHERE W1.temp_lo < W2.temp_lo
    AND W1.temp_hi > W2.temp_hi;

SELECT DISTINCT 
  tour_expeditions.employee_number,
  employee_name,location_name 
  FROM tour_locations,
       tour_expeditions,
       tour_guides 
  WHERE tour_locations.location_code = tour_expeditions.location_code AND 
        tour_expeditions.employee_number=tour_guides.employee_number

// how do we return the employee numbers, names and locations of all guides, 
// including those who have not yet given a tour:
SELECT DISTINCT 
       tour_guides.employee_number,employee_name,location_name 
       FROM tour_guides 
       LEFT JOIN tour_expeditions ON 
          tour_guides.employee_number = tour_expeditions.employee_number 
       LEFT JOIN tour_locations ON 
          tour_locations.location_code=tour_expeditions.location_code

 SELECT(FROM(Customer.AS("c"),
             LEFT_OUTER_JOIN(Invoice.AS("i")).ON(EQ(c.id, i.custId)),
             LEFT_OUTER_JOIN(Region.AS("r")).ON(EQ(c.regionId, r.id))), 
        WHERE(LT(i.total, 1000), 
              EQ(r.regionName, "west")),
        r.regionName, c.lastName, i.date.AS("INV DATE"), i.total)

// pseudocode...

testFunc = function(c, i, r) {
  if (c.id != null &&
      !(c.id == i.custId)) // LEFT OUTER JOIN ON clause 0
    return false;
  if (!(c.regionId == r.id)) // INNER JOIN ON clause 1
    return false;
  if ((i.total) > 1000 && r.regionName == "west") // WHERE clause
    return true;
  return false;
}

var result = []; // the result after join and where

// compiled join driver logic looks like...

var currCrossJoinRecord = [];
for (t0 = 0; t0 < T0.length; t0++) {
  currCrossJoinRecord[0] = T0[t0];
  var resultLength0 = result.length;
  for (t1 = 0; t1 < T1.length; t1++) {
    currCrossJoinRecord[1] = T1[t1];
    var resultLength1 = result.length;
    for (t2 = 0; t2 < T2.length; t2++) {
      currCrossJoinRecord[2] = T2[t2];
      var resultLength2 = result.length;
      if (testFunc.apply(fake, currCrossJoinRecord))
        result.push(currCrossJoinRecord.slice(0)); // slice(0) == array copy
    }
    if (resultLength1 == result.length && LEFT_OUTER_JOIN) {
      currCrossJoinRecord[2] = {};
      result.push(currCrossJoinRecord.slice(0));
    }
  }
  if (resultLength0 == result.length and LEFT_OUTER_JOIN) {
    currCrossJoinRecord[1] = currCrossJoinRecord[2] = {};
    result.push(currCrossJoinRecord.slice(0));
  }
}

columnConvertor = function(_BINDINGS, c, i, r) {
    with (_BINDINGS) {
        var result = {};
        result[0] = result["regionName"] = r.regionName;
        result[1] = result["lastName"] = c.lastName;
        result[2] = result["INV DATE"] = i.date;
        result[3] = result["total"] = i.total;
        result[4] = result["INV_TOTAL"] = SUM("INV_TOTAL", (i.total));
        return result;
    }
}

// GROUP_BY processing pseudocode...

var zeroDefault = function(x) { return (x != null ? x : return x); }

var arrayCompare = function(x, y) {
  if (x == null || y == null) return -1; // Required behavior for GROUP_BY to work.
  for (var i = 0; i < x.length && i < br.length; i++) {
    if (x[i] < y[i]) return -1;
    if (x[i] > y[i]) return 1;
  }
  return 0;
}

var groupByComparator = function(a, b) {
  return arrayCompare(a.groupByValues, b.groupByValues);
}

///////////

var groupByCalcValues = function(Invoice, c, r) {
  var result = [];
  result[0] = Invoice.region;
  result[1] = c.level;
  return result;
}

if (groupByCalcValues != null) {
    for (var i = 0; i < resultOfFromWhere.length; i++)
        resultOfFromWhere[i].groupByValues = groupByCalcValues.apply(null, resultOfFromWhere[i]);
    resultOfFromWhere.sort(groupByComparator);
}

var groupByAccum = {};
var groupByFuncs = { 
    SUM : function(key, val) { 
        groupByAccum[key] = zeroDefault(groupByAccum[key]) + zeroDefault(val);
        return groupByAccum[key];
    }, 
    COUNT : function(key) { 
        groupByAccum[key] = zeroDefault(groupByAccum[key]) + 1;
        return groupByAccum[key];
    },
    AVG : function(key, val) { 
        return groupByFuncs.SUM(key, val) / groupByFuncs.COUNT("_COUNT" + key);
    }
};

var currItem, prevItem = null;
for (var i = 0; i < resultOfFromWhere.length; i++) {
    if (prevItem != null &&
        groupByComparator(prevItem, currItem) != 0) {
        result.push(prevItem.record);
        groupByAccum = {};
    }
    currItem        = resultOfFromWhere[i];
    currItem[0]     = groupByFuncs;
    currItem.record = columnConvertor.apply(null, currItem); // Must visit every item to calculate aggregates.
    prevItem = currItem;
}
if (prevItem != null)
    result.push(prevItem.record);

columnConvertor = function(Invoice, c, r) {
  // Invoice.region, SUM(Invoice.total) / 100.0 
}

result.sort(orderByComparator);

// Various notes to self on SQL SELECT syntax and edge cases...

SELECT product_id, p.name, (sum(s.units) * (p.price - p.cost)) AS profit
    FROM products p LEFT JOIN sales s USING (product_id)
    WHERE s.date > CURRENT_DATE - INTERVAL '4 weeks'
    GROUP BY product_id, p.name, p.price, p.cost
    HAVING sum(p.price * s.units) > 5000;

In the example above, the WHERE clause is selecting rows by a column that is 
not grouped (the expression is only true for sales during the last four weeks), 
while the HAVING clause restricts the output to groups with total gross sales 
over 5000. Note that the aggregate expressions do not necessarily need 
to be the same in all parts of the query. 

SELECT 'Currency: ' || currency
    FROM currencies
    WHERE code LIKE 'A%';
 Currency: UAE Dirhams
 Currency: Afghanis
 Currency: Leke
 Currency: Armenian Drams
 Currency: Netherlands Antillian Guilders
 Currency: Kwanza

SELECT exchange_rate, '10% reduction:',
        exchange_rate * 0.90 AS new_exchange_rate
    FROM currencies
    WHERE code = 'USD';
 EXCHANGE_RATE                   NEW_EXCHANGE_RATE
 0.8711         10% reduction:   0.783990

 COUNT(SAMPLE)	8
 COUNT(*)	    10 -- counts nulls
 COUNT(DISTINCT SAMPLE)	5
 SUM(SAMPLE)            22.0
 SUM(ALL SAMPLE)        22.0 - includes nulls
 SUM(DISTINCT SAMPLE)   15.0
 AVG(SAMPLE)            2.75000000000
 AVG(ALL SAMPLE)        2.75000000000
 AVG(DISTINCT SAMPLE)   3.00000000000
 MAX(SAMPLE)	5.0
 MIN(SAMPLE)	1.0

SELECT regno FROM car
WHERE colour = ANY (SELECT colour FROM car WHERE owner = 'Jim Smith');

SELECT name,dob
FROM driver
WHERE dob < ALL (
              SELECT dob
              FROM car join driver on (owner=name)
              WHERE colour = 'BLUE'
      );

SELECT colour
FROM car a
WHERE exists (
        select colour             -- does not matter what is selected
        from car b                -- As we use CAR twice, call this one b
        where a.colour = b.colour -- CAR rows with the same colour as a
        and   a.regno != b.regno  -- but a car different to the one in a
     );

stmt = SELECT(Customer.region, SUM(Customer.acctBalance),
			  FROM(Customer),
              GROUP_BY(Customer.region),
              HAVING(GT(SUM(Customer.acctBalance), 1000000)),
              ORDER_BY(Customer.region.ASC));

--------------------------------
sql-statement ::= SELECT [ALL | DISTINCT] result [FROM table-list]
                        [WHERE expr]
                        [GROUP BY expr-list]
                        [HAVING expr]
                        [compound-op select]*
                        [ORDER BY sort-expr-list]
                        [LIMIT integer [( OFFSET | , ) integer]]
result         ::= result-column [, result-column]*
result-column  ::= * | table-name . * | expr [ [AS] string ]
table-list     ::= table [join-op table join-args]*
table          ::= table-name [AS alias] | ( select ) [AS alias]
join-op        ::= , | [NATURAL] [LEFT | RIGHT | FULL] [OUTER | INNER | CROSS] JOIN // this appears wrong!!
join-args      ::= [ON expr] [USING ( id-list )]
sort-expr-list ::= expr [sort-order] [, expr [sort-order]]*
sort-order     ::= [ COLLATE collation-name ] [ ASC | DESC ]
compound_op    ::= UNION | UNION ALL | INTERSECT | EXCEPT

The query is executed against one or more tables specified after the FROM keyword. 
If multiple tables names are separated by commas, then the query is against the 
cross join of the various tables. The full SQL-92 join syntax can also be used 
to specify joins. A sub-query in parentheses may be substituted for any table 
name in the FROM clause. The entire FROM clause may be omitted, in which case 
the result is a single row consisting of the values of the expression list.
*/

function deepToString(obj, prefix) {
  if (prefix == null)
      prefix = "";
  if (!(obj instanceof Object))
    return String(obj);

  var out = [], first = true;
  out.push("{ ");
  for (var k in obj) {
    if(typeof(obj[k]) != "function") {
        if (first != true) {
          out.push(",\n");
          out.push(prefix);
        }
        out.push(k + ": " + deepToString(obj[k], prefix + "  "));
        first = false;
    }
  }
  out.push(" }");
  return out.join("");
}

function debugDeep(rs) {
  debug(deepToString(rs));
}
