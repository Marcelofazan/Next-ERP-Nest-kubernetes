import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

/**
 * Añade unit_price a order_items para preservar precio histórico.
 * Rollback: elimina la columna.
 */
export class AddUnitPriceToOrderItems1000000000001 implements MigrationInterface {
  name = 'AddUnitPriceToOrderItems1000000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('order_items');
    if (table?.findColumnByName('unit_price')) return; // ya existe (idempotente)

    await queryRunner.addColumn(
      'order_items',
      new TableColumn({
        name: 'unit_price',
        type: 'decimal',
        precision: 10,
        scale: 2,
        isNullable: true, // nullable para no romper filas existentes
      }),
    );

    // Rellenar filas existentes con el precio actual del producto como aproximación
    await queryRunner.query(`
      UPDATE order_items oi
      SET unit_price = (
        SELECT p.price FROM products p WHERE p.id = oi.product_id
      )
      WHERE oi.unit_price IS NULL
    `);

    // Ahora hacerla NOT NULL
    await queryRunner.changeColumn(
      'order_items',
      'unit_price',
      new TableColumn({
        name: 'unit_price',
        type: 'decimal',
        precision: 10,
        scale: 2,
        isNullable: false,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('order_items');
    if (!table?.findColumnByName('unit_price')) return;
    await queryRunner.dropColumn('order_items', 'unit_price');
  }
}
