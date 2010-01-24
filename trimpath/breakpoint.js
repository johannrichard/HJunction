/**
 * TrimPath Breakpoint. Release 1.1.0.
 * Copyright (C) 2004 - 2007 TrimPath.
 * 
 * TrimPath Breakpoint is licensed under the GNU General Public License
 * and the Apache License, Version 2.0, as follows:
 *
 * This program is free software; you can redistribute it and/or 
 * modify it under the terms of the GNU General Public License
 * as published by the Free Software Foundation; either version 2
 * of the License, or (at your option) any later version.
 * 
 * This program is distributed WITHOUT ANY WARRANTY; without even the 
 * implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  
 * See the GNU General Public License for more details.
 * 
 * You should have received a copy of the GNU General Public License
 * along with this program; if not, write to the Free Software
 * Foundation, Inc., 59 Temple Place - Suite 330, Boston, MA 02111-1307, USA.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 * 
 * http://www.apache.org/licenses/LICENSE-2.0
 * 
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
if (typeof(TrimPath) == 'undefined')
    TrimPath = {};

/**
 * TrimPath.breakpoint usage: 
 *
 * In the middle of your code somewhere, add a line of code like...
 *
 *   breakpoint(function(expr) { return eval(expr); });
 *
 * You can also pass a message, like...
 *
 *   breakpoint(function(expr) { return eval(expr); }, "breakpoint #2 in datetime validation");
 *
 * Then, you can enter expressions in the prompt dialog to inspect variables and objects
 * in the breakpoint's scope.  Click Cancel in the prompt dialog to continue processing.
 */
var breakpoint = TrimPath.breakpoint = function(evalFunc, msg) { 
    // TrimPath.breakpoint currently works only in DOM/browser environment.
    if (msg == null)
        msg = "";
    var result = "1+2";
    while (true) {
        var expr = prompt("BREAKPOINT: " + msg + "\nPlease enter an expression to evaluate.", result); 
        if (expr == null || expr == "")
            return;
        try {
            result = evalFunc(expr);
        } catch (e) {
            result = e;
        }
    }
}
